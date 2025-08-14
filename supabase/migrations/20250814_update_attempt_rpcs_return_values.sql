-- Migration: Update attempt RPCs to include attempt_id in start_test_attempt and return result payload in submit_test_result
-- Date: 2025-08-14
-- Note: Safe to re-create functions; SECURITY DEFINER preserved.

BEGIN;

-- Update start_test_attempt to return attempt_id
CREATE OR REPLACE FUNCTION public.start_test_attempt(
  p_test_id uuid,
  p_student_id uuid
) RETURNS jsonb AS $$
DECLARE
  v_attempt test_attempts%ROWTYPE;
  v_test tests%ROWTYPE;
BEGIN
  SELECT * INTO v_test FROM tests WHERE id = p_test_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TEST_NOT_FOUND';
  END IF;

  SELECT * INTO v_attempt FROM test_attempts 
    WHERE test_id = p_test_id AND student_id = p_student_id;

  IF NOT FOUND THEN
    INSERT INTO test_attempts(test_id, student_id, started_at, status)
    VALUES (p_test_id, p_student_id, now(), 'in_progress')
    RETURNING * INTO v_attempt;
  END IF;

  RETURN jsonb_build_object(
    'attempt_id', v_attempt.id,
    'started_at', v_attempt.started_at,
    'status', v_attempt.status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.start_test_attempt(uuid, uuid) IS 'Creates or returns existing test attempt for a student. Returns attempt_id.';

-- Update submit_test_result to also return attempt status and attempt_id (unchanged core logic)
CREATE OR REPLACE FUNCTION public.submit_test_result(
  p_test_id uuid,
  p_student_id uuid,
  p_answers int[]
) RETURNS jsonb AS $$
DECLARE
  v_test tests%ROWTYPE;
  v_attempt test_attempts%ROWTYPE;
  v_total int;
  v_correct int := 0;
  v_idx int := 1;
  v_q RECORD;
  v_time_taken int;
  v_score numeric(5,2);
  v_existing test_results%ROWTYPE;
BEGIN
  SELECT * INTO v_test FROM tests WHERE id = p_test_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TEST_NOT_FOUND';
  END IF;
  IF v_test.is_active IS NOT TRUE THEN
    RAISE EXCEPTION 'TEST_INACTIVE';
  END IF;
  IF now() < v_test.start_date OR now() > v_test.end_date THEN
    RAISE EXCEPTION 'TEST_WINDOW_CLOSED';
  END IF;

  SELECT * INTO v_attempt FROM test_attempts 
    WHERE test_id = p_test_id AND student_id = p_student_id;
  IF NOT FOUND THEN
    INSERT INTO test_attempts(test_id, student_id, started_at, status)
    VALUES (p_test_id, p_student_id, now(), 'in_progress')
    RETURNING * INTO v_attempt;
  END IF;

  IF v_attempt.status = 'submitted' THEN
    RAISE EXCEPTION 'ALREADY_SUBMITTED';
  END IF;

  v_time_taken := GREATEST(0, LEAST(EXTRACT(EPOCH FROM (now() - v_attempt.started_at))::int, v_test.duration * 60));

  v_total := 0;
  FOR v_q IN SELECT id, correct_answer, order_index FROM questions WHERE test_id = p_test_id ORDER BY order_index LOOP
    v_total := v_total + 1;
    IF array_length(p_answers,1) IS NOT NULL AND p_answers[v_idx] = v_q.correct_answer THEN
      v_correct := v_correct + 1;
    END IF;
    v_idx := v_idx + 1;
  END LOOP;
  IF v_total = 0 THEN
    RAISE EXCEPTION 'NO_QUESTIONS';
  END IF;
  v_score := ROUND( (v_correct::numeric / v_total::numeric) * 100.0 , 2);

  SELECT * INTO v_existing FROM test_results WHERE test_id = p_test_id AND student_id = p_student_id;
  IF FOUND THEN
    RAISE EXCEPTION 'RESULT_ALREADY_EXISTS';
  END IF;

  INSERT INTO test_results(test_id, student_id, score, total_questions, time_taken, answers, completed_at)
  VALUES (p_test_id, p_student_id, v_score, v_total, v_time_taken, to_jsonb(p_answers), now());

  UPDATE test_attempts SET status = 'submitted', submitted_at = now() WHERE id = v_attempt.id;

  RETURN jsonb_build_object(
    'attempt_id', v_attempt.id,
    'score', v_score,
    'correct', v_correct,
    'total', v_total,
    'time_taken', v_time_taken,
    'status', 'submitted'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.submit_test_result(uuid, uuid, int[]) IS 'Scores and records a test result server-side. Returns attempt_id + score details.';

COMMIT;
