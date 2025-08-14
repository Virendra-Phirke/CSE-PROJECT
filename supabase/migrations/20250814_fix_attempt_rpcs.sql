-- Migration: Fix broken attempt RPCs (recreate start_test_attempt & submit_test_result)
-- Date: 2025-08-14
-- Reason: Previous migration introduced invalid PL/pgSQL (inline DECLARE) causing function creation failure -> 404 RPC.
-- This migration:
--  * Ensures needed columns exist
--  * Drops any broken helper shuffle function
--  * Recreates clean, working versions of start_test_attempt & submit_test_result with
--    deterministic ordering (no server shuffle to simplify) and per-question logging.
--  * Supports option/order metadata for client-side randomization (identity permutations here).

BEGIN;

-- Ensure columns present
ALTER TABLE test_attempts ADD COLUMN IF NOT EXISTS question_order uuid[];
ALTER TABLE test_attempts ADD COLUMN IF NOT EXISTS option_orders jsonb;

-- Drop broken helper if it exists
DROP FUNCTION IF EXISTS public._shuffle_uuid_array(uuid[]);

-- (Optional) Ensure analytics table exists (idempotent)
CREATE TABLE IF NOT EXISTS test_question_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES test_attempts(id) ON DELETE CASCADE,
  test_id uuid NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  selected_option int,
  correct_answer int NOT NULL,
  is_correct boolean NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE test_question_answers ENABLE ROW LEVEL SECURITY;
-- Policies assumed created in prior migration; skip here to avoid duplication.

-- Recreate start_test_attempt
CREATE OR REPLACE FUNCTION public.start_test_attempt(
  p_test_id uuid,
  p_student_id uuid
) RETURNS jsonb AS $$
DECLARE
  v_attempt test_attempts%ROWTYPE;
  v_test tests%ROWTYPE;
  v_qids uuid[];
  v_perm uuid[];
  v_option_orders jsonb := '{}'::jsonb;
  v_q RECORD;
  opt_count int;
  v_opt_perm int[];
BEGIN
  SELECT * INTO v_test FROM tests WHERE id = p_test_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'TEST_NOT_FOUND'; END IF;

  SELECT * INTO v_attempt FROM test_attempts WHERE test_id = p_test_id AND student_id = p_student_id;

  IF NOT FOUND THEN
    SELECT array_agg(id ORDER BY order_index) INTO v_qids FROM questions WHERE test_id = p_test_id;
    IF v_qids IS NULL THEN RAISE EXCEPTION 'NO_QUESTIONS'; END IF;
    -- Deterministic ordering (client may shuffle). For server shuffle, add Fisher-Yates later.
    v_perm := v_qids;

    FOR v_q IN SELECT id, options FROM questions WHERE test_id = p_test_id LOOP
      opt_count := COALESCE(jsonb_array_length(v_q.options::jsonb), 0);
      IF opt_count > 0 THEN
        v_opt_perm := ARRAY(SELECT generate_series(0, opt_count - 1)); -- identity mapping
        v_option_orders := v_option_orders || jsonb_build_object(v_q.id::text, to_jsonb(v_opt_perm));
      END IF;
    END LOOP;

    INSERT INTO test_attempts(test_id, student_id, started_at, status, question_order, option_orders)
    VALUES (p_test_id, p_student_id, now(), 'in_progress', v_perm, v_option_orders)
    RETURNING * INTO v_attempt;
  END IF;

  RETURN jsonb_build_object(
    'attempt_id', v_attempt.id,
    'started_at', v_attempt.started_at,
    'status', v_attempt.status,
    'question_order', v_attempt.question_order,
    'option_orders', v_attempt.option_orders
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path=public;

COMMENT ON FUNCTION public.start_test_attempt(uuid, uuid) IS 'Creates or returns existing test attempt with ordering metadata.';

-- Recreate submit_test_result (order-aware + per-question logging)
CREATE OR REPLACE FUNCTION public.submit_test_result(
  p_test_id uuid,
  p_student_id uuid,
  p_answers int[]
) RETURNS jsonb AS $$
DECLARE
  v_test tests%ROWTYPE;
  v_attempt test_attempts%ROWTYPE;
  v_total int := 0;
  v_correct int := 0;
  v_time_taken int;
  v_score numeric(5,2);
  v_existing test_results%ROWTYPE;
  qid uuid;
  idx int := 1;
  v_q questions%ROWTYPE;
  v_perm jsonb;
  v_perm_arr int[];
  selected_display_index int;
  selected_original_index int;
  is_corr boolean;
BEGIN
  SELECT * INTO v_test FROM tests WHERE id = p_test_id; IF NOT FOUND THEN RAISE EXCEPTION 'TEST_NOT_FOUND'; END IF;
  IF v_test.is_active IS NOT TRUE THEN RAISE EXCEPTION 'TEST_INACTIVE'; END IF;
  IF now() < v_test.start_date OR now() > v_test.end_date THEN RAISE EXCEPTION 'TEST_WINDOW_CLOSED'; END IF;

  SELECT * INTO v_attempt FROM test_attempts WHERE test_id = p_test_id AND student_id = p_student_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'ATTEMPT_NOT_FOUND'; END IF;
  IF v_attempt.status = 'submitted' THEN RAISE EXCEPTION 'ALREADY_SUBMITTED'; END IF;

  v_time_taken := GREATEST(0, LEAST(EXTRACT(EPOCH FROM (now() - v_attempt.started_at))::int, v_test.duration * 60));

  IF v_attempt.question_order IS NULL THEN
    -- Legacy deterministic order
    FOR v_q IN SELECT * FROM questions WHERE test_id = p_test_id ORDER BY order_index LOOP
      v_total := v_total + 1;
      selected_display_index := COALESCE(p_answers[idx], -1);
      IF selected_display_index = v_q.correct_answer THEN v_correct := v_correct + 1; END IF;
      INSERT INTO test_question_answers(attempt_id, test_id, question_id, student_id, selected_option, correct_answer, is_correct)
      VALUES (v_attempt.id, p_test_id, v_q.id, p_student_id, selected_display_index, v_q.correct_answer, selected_display_index = v_q.correct_answer);
      idx := idx + 1;
    END LOOP;
  ELSE
    FOREACH qid IN ARRAY v_attempt.question_order LOOP
      v_total := v_total + 1;
      SELECT * INTO v_q FROM questions WHERE id = qid;
      selected_display_index := COALESCE(p_answers[idx], -1);
      v_perm := (v_attempt.option_orders -> qid::text);
      IF v_perm IS NOT NULL THEN
        -- Convert JSON array to int[] respecting order
        SELECT array_agg(value::int ORDER BY ord) INTO v_perm_arr FROM jsonb_array_elements_text(v_perm) WITH ORDINALITY;
        IF selected_display_index >= 0 AND selected_display_index < array_length(v_perm_arr,1) THEN
          selected_original_index := v_perm_arr[selected_display_index+1];
        ELSE
          selected_original_index := -1;
        END IF;
      ELSE
        selected_original_index := selected_display_index;
      END IF;
      is_corr := (selected_original_index = v_q.correct_answer);
      IF is_corr THEN v_correct := v_correct + 1; END IF;
      INSERT INTO test_question_answers(attempt_id, test_id, question_id, student_id, selected_option, correct_answer, is_correct)
      VALUES (v_attempt.id, p_test_id, v_q.id, p_student_id, selected_original_index, v_q.correct_answer, is_corr);
      idx := idx + 1;
    END LOOP;
  END IF;

  IF v_total = 0 THEN RAISE EXCEPTION 'NO_QUESTIONS'; END IF;

  v_score := ROUND( (v_correct::numeric / v_total::numeric) * 100.0 , 2);
  SELECT * INTO v_existing FROM test_results WHERE test_id = p_test_id AND student_id = p_student_id; IF FOUND THEN RAISE EXCEPTION 'RESULT_ALREADY_EXISTS'; END IF;

  INSERT INTO test_results(test_id, student_id, score, total_questions, time_taken, answers, completed_at)
  VALUES (p_test_id, p_student_id, v_score, v_total, v_time_taken, to_jsonb(p_answers), now());
  UPDATE test_attempts SET status='submitted', submitted_at=now() WHERE id = v_attempt.id;

  RETURN jsonb_build_object('attempt_id', v_attempt.id,'score', v_score,'correct', v_correct,'total', v_total,'time_taken', v_time_taken,'status','submitted');
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path=public;

COMMENT ON FUNCTION public.submit_test_result(uuid, uuid, int[]) IS 'Scores test (order-aware) + logs per-question answers.';

COMMIT;
