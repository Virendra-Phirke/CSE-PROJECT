-- Migration: Finalize attempt RPCs (clean recreation)
-- Date: 2025-08-14
-- Purpose: Remove broken earlier definitions of start_test_attempt / submit_test_result (404 issues)
--          Ensure ordering metadata & per-question logging are supported and stable.
--          Idempotently align table schemas.

BEGIN;

-- 1. Ensure supporting columns on test_attempts
ALTER TABLE public.test_attempts
  ADD COLUMN IF NOT EXISTS question_order uuid[],
  ADD COLUMN IF NOT EXISTS option_orders jsonb,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz;

-- 2. Ensure comprehensive per-question answer logging table
CREATE TABLE IF NOT EXISTS public.test_question_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.test_attempts(id) ON DELETE CASCADE,
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  selected_option int,
  correct_answer int NOT NULL,
  is_correct boolean NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add any missing columns (if table pre-existed in reduced form)
ALTER TABLE public.test_question_answers ADD COLUMN IF NOT EXISTS attempt_id uuid REFERENCES public.test_attempts(id) ON DELETE CASCADE;
ALTER TABLE public.test_question_answers ADD COLUMN IF NOT EXISTS selected_option int;
ALTER TABLE public.test_question_answers ADD COLUMN IF NOT EXISTS correct_answer int;
ALTER TABLE public.test_question_answers ADD COLUMN IF NOT EXISTS is_correct boolean;

-- Enable RLS (safe if already enabled)
ALTER TABLE public.test_question_answers ENABLE ROW LEVEL SECURITY;

-- 3. Drop broken helper & recreate (optional randomization helper not strictly needed now)
DROP FUNCTION IF EXISTS public._shuffle_uuid_array(uuid[]);

-- 4. Drop existing RPCs so we can recreate cleanly
DROP FUNCTION IF EXISTS public.start_test_attempt(uuid, uuid);
DROP FUNCTION IF EXISTS public.submit_test_result(uuid, uuid, int[]);

-- 5. (Re)Create start_test_attempt with ordering metadata (deterministic order; server shuffle can be added later)
CREATE OR REPLACE FUNCTION public.start_test_attempt(
  p_test_id uuid,
  p_student_id uuid
) RETURNS jsonb AS $$
DECLARE
  v_attempt public.test_attempts%ROWTYPE;
  v_test public.tests%ROWTYPE;
  v_qids uuid[];
  v_option_orders jsonb := '{}'::jsonb;
  v_q RECORD;
  opt_count int;
  v_opt_perm int[];
BEGIN
  SELECT * INTO v_test FROM public.tests WHERE id = p_test_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'TEST_NOT_FOUND'; END IF;
  IF v_test.is_active IS NOT TRUE THEN RAISE EXCEPTION 'TEST_INACTIVE'; END IF;
  IF now() < v_test.start_date OR now() > v_test.end_date THEN RAISE EXCEPTION 'TEST_WINDOW_CLOSED'; END IF;

  SELECT * INTO v_attempt FROM public.test_attempts WHERE test_id = p_test_id AND student_id = p_student_id;

  IF NOT FOUND THEN
    SELECT array_agg(id ORDER BY order_index) INTO v_qids FROM public.questions WHERE test_id = p_test_id;
    IF v_qids IS NULL THEN RAISE EXCEPTION 'NO_QUESTIONS'; END IF;

    -- Build identity option permutations per question (front-end may shuffle visually)
    FOR v_q IN SELECT id, options FROM public.questions WHERE test_id = p_test_id LOOP
      opt_count := COALESCE(jsonb_array_length(v_q.options::jsonb), 0);
      IF opt_count > 0 THEN
        v_opt_perm := ARRAY(SELECT generate_series(0, opt_count - 1));
        v_option_orders := v_option_orders || jsonb_build_object(v_q.id::text, to_jsonb(v_opt_perm));
      END IF;
    END LOOP;

    INSERT INTO public.test_attempts(test_id, student_id, started_at, status, question_order, option_orders)
    VALUES (p_test_id, p_student_id, now(), 'in_progress', v_qids, v_option_orders)
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

-- 6. (Re)Create submit_test_result respecting ordering + per-question logging
CREATE OR REPLACE FUNCTION public.submit_test_result(
  p_test_id uuid,
  p_student_id uuid,
  p_answers int[]
) RETURNS jsonb AS $$
DECLARE
  v_test public.tests%ROWTYPE;
  v_attempt public.test_attempts%ROWTYPE;
  v_total int := 0;
  v_correct int := 0;
  v_time_taken int;
  v_score numeric(5,2);
  v_existing public.test_results%ROWTYPE;
  qid uuid;
  idx int := 1;
  v_q public.questions%ROWTYPE;
  v_perm jsonb;
  v_perm_arr int[];
  selected_display_index int;
  selected_original_index int;
  is_corr boolean;
BEGIN
  SELECT * INTO v_test FROM public.tests WHERE id = p_test_id; IF NOT FOUND THEN RAISE EXCEPTION 'TEST_NOT_FOUND'; END IF;
  IF v_test.is_active IS NOT TRUE THEN RAISE EXCEPTION 'TEST_INACTIVE'; END IF;
  IF now() < v_test.start_date OR now() > v_test.end_date THEN RAISE EXCEPTION 'TEST_WINDOW_CLOSED'; END IF;

  SELECT * INTO v_attempt FROM public.test_attempts WHERE test_id = p_test_id AND student_id = p_student_id; IF NOT FOUND THEN RAISE EXCEPTION 'ATTEMPT_NOT_FOUND'; END IF;
  IF v_attempt.status = 'submitted' THEN RAISE EXCEPTION 'ALREADY_SUBMITTED'; END IF;

  v_time_taken := GREATEST(0, LEAST(EXTRACT(EPOCH FROM (now() - v_attempt.started_at))::int, v_test.duration * 60));

  IF v_attempt.question_order IS NULL THEN
    FOR v_q IN SELECT * FROM public.questions WHERE test_id = p_test_id ORDER BY order_index LOOP
      v_total := v_total + 1;
      selected_display_index := COALESCE(p_answers[idx], -1);
      IF selected_display_index = v_q.correct_answer THEN v_correct := v_correct + 1; END IF;
      INSERT INTO public.test_question_answers(attempt_id, test_id, question_id, student_id, selected_option, correct_answer, is_correct)
      VALUES (v_attempt.id, p_test_id, v_q.id, p_student_id, selected_display_index, v_q.correct_answer, selected_display_index = v_q.correct_answer);
      idx := idx + 1;
    END LOOP;
  ELSE
    FOREACH qid IN ARRAY v_attempt.question_order LOOP
      v_total := v_total + 1;
      SELECT * INTO v_q FROM public.questions WHERE id = qid;
      selected_display_index := COALESCE(p_answers[idx], -1);
      v_perm := (v_attempt.option_orders -> qid::text);
      IF v_perm IS NOT NULL THEN
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
      INSERT INTO public.test_question_answers(attempt_id, test_id, question_id, student_id, selected_option, correct_answer, is_correct)
      VALUES (v_attempt.id, p_test_id, v_q.id, p_student_id, selected_original_index, v_q.correct_answer, is_corr);
      idx := idx + 1;
    END LOOP;
  END IF;

  IF v_total = 0 THEN RAISE EXCEPTION 'NO_QUESTIONS'; END IF;

  v_score := ROUND( (v_correct::numeric / v_total::numeric) * 100.0 , 2);
  SELECT * INTO v_existing FROM public.test_results WHERE test_id = p_test_id AND student_id = p_student_id; IF FOUND THEN RAISE EXCEPTION 'RESULT_ALREADY_EXISTS'; END IF;

  INSERT INTO public.test_results(test_id, student_id, score, total_questions, time_taken, answers, completed_at)
  VALUES (p_test_id, p_student_id, v_score, v_total, v_time_taken, to_jsonb(p_answers), now());

  UPDATE public.test_attempts SET status='submitted', submitted_at=now() WHERE id = v_attempt.id;

  RETURN jsonb_build_object('attempt_id', v_attempt.id,'score', v_score,'correct', v_correct,'total', v_total,'time_taken', v_time_taken,'status','submitted');
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path=public;

COMMENT ON FUNCTION public.submit_test_result(uuid, uuid, int[]) IS 'Scores test (order-aware) + logs per-question answers.';

COMMIT;
