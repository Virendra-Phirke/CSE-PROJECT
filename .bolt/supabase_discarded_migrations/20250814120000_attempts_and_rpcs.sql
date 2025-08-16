-- Migration: attempts table, question answers table, RPC functions for starting and submitting attempts

-- 1. Supporting tables
CREATE TABLE IF NOT EXISTS test_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'in_progress', -- in_progress | submitted | timed_out
  question_order uuid[] DEFAULT '{}',
  option_orders jsonb DEFAULT '{}', -- { question_id: [permutation array] }
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS test_question_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_correct boolean NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_test_attempts_test_student ON test_attempts(test_id, student_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_status ON test_attempts(status);
CREATE INDEX IF NOT EXISTS idx_tqa_test ON test_question_answers(test_id);
CREATE INDEX IF NOT EXISTS idx_tqa_question ON test_question_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_tqa_student ON test_question_answers(student_id);

-- Enable RLS
ALTER TABLE test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_question_answers ENABLE ROW LEVEL SECURITY;

-- Policies for test_attempts
CREATE POLICY IF NOT EXISTS "Students manage own attempts" ON test_attempts FOR ALL TO authenticated USING (student_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Teachers view attempts for their tests" ON test_attempts FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM tests WHERE tests.id = test_attempts.test_id AND tests.created_by = auth.uid()
  )
);

-- Policies for test_question_answers
CREATE POLICY IF NOT EXISTS "Students view own tqa" ON test_question_answers FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Teachers view tqa for own tests" ON test_question_answers FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM tests WHERE tests.id = test_question_answers.test_id AND tests.created_by = auth.uid()
  )
);

-- 2. RPC: start_test_attempt
CREATE OR REPLACE FUNCTION start_test_attempt(p_test_id uuid, p_student_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_test RECORD;
  v_attempt test_attempts%ROWTYPE;
  v_question_ids uuid[];
  v_question_id uuid;
  v_option_orders jsonb := '{}';
  v_options jsonb;
  v_perm int[];
BEGIN
  SELECT * INTO v_test FROM tests 
    WHERE id = p_test_id 
      AND is_active = true 
      AND start_date <= now() 
      AND end_date >= now();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TEST_NOT_AVAILABLE';
  END IF;

  -- Existing non-submitted attempt
  SELECT * INTO v_attempt FROM test_attempts 
    WHERE test_id = p_test_id AND student_id = p_student_id 
    ORDER BY started_at DESC LIMIT 1;
  IF FOUND AND v_attempt.status <> 'submitted' THEN
    RETURN jsonb_build_object(
      'attempt_id', v_attempt.id,
      'started_at', v_attempt.started_at,
      'status', v_attempt.status,
      'question_order', v_attempt.question_order,
      'option_orders', v_attempt.option_orders
    );
  END IF;

  -- Build fresh ordering
  SELECT array_agg(id ORDER BY order_index) INTO v_question_ids FROM questions WHERE test_id = p_test_id;
  IF v_question_ids IS NULL OR array_length(v_question_ids,1) = 0 THEN
    RAISE EXCEPTION 'NO_QUESTIONS';
  END IF;

  -- Shuffle question order (Fisher-Yates)
  PERFORM setseed(extract(epoch FROM clock_timestamp())::double precision % 1);
  FOR i IN REVERSE COALESCE(array_length(v_question_ids,1),1)..2 LOOP
    -- random index 1..i
    SELECT 1 + floor(random()*i)::int INTO STRICT v_perm; -- reuse variable
  END LOOP;
  -- Simpler shuffle using ORDER BY random for brevity
  SELECT array_agg(qid) INTO v_question_ids FROM (
    SELECT unnest(v_question_ids) AS qid ORDER BY random()
  ) s;

  -- Option orders per question
  FOR v_question_id IN SELECT unnest(v_question_ids) LOOP
    SELECT options INTO v_options FROM questions WHERE id = v_question_id;
    -- Build permutation array length = jsonb_array_length(v_options)
    SELECT array_agg(idx) FROM (
      SELECT generate_series(0, jsonb_array_length(v_options)-1) AS idx ORDER BY random()
    ) p INTO v_perm;
    v_option_orders := v_option_orders || jsonb_build_object(v_question_id::text, to_jsonb(v_perm));
  END LOOP;

  INSERT INTO test_attempts(test_id, student_id, question_order, option_orders)
  VALUES (p_test_id, p_student_id, v_question_ids, v_option_orders)
  RETURNING * INTO v_attempt;

  RETURN jsonb_build_object(
    'attempt_id', v_attempt.id,
    'started_at', v_attempt.started_at,
    'status', v_attempt.status,
    'question_order', v_attempt.question_order,
    'option_orders', v_attempt.option_orders
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. RPC: submit_test_result
CREATE OR REPLACE FUNCTION submit_test_result(p_test_id uuid, p_student_id uuid, p_answers int[])
RETURNS jsonb AS $$
DECLARE
  v_attempt test_attempts%ROWTYPE;
  v_questions RECORD;
  v_question_ids uuid[];
  v_qid uuid;
  v_idx int := 1;
  v_correct int := 0;
  v_total int := 0;
  v_option_perm int[];
  v_original_answer int;
  v_question_row questions%ROWTYPE;
  v_pct numeric(5,2);
  v_existing_result RECORD;
BEGIN
  SELECT * INTO v_attempt FROM test_attempts 
    WHERE test_id = p_test_id AND student_id = p_student_id 
    ORDER BY started_at DESC LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ATTEMPT_NOT_FOUND';
  END IF;
  IF v_attempt.status = 'submitted' THEN
    RETURN jsonb_build_object('status','already_submitted');
  END IF;

  v_question_ids := v_attempt.question_order;
  v_total := COALESCE(array_length(v_question_ids,1),0);
  IF v_total = 0 THEN
    RAISE EXCEPTION 'NO_QUESTIONS';
  END IF;
  IF p_answers IS NULL OR array_length(p_answers,1) <> v_total THEN
    RAISE EXCEPTION 'ANSWER_LENGTH_MISMATCH';
  END IF;

  FOR v_idx IN 1..v_total LOOP
    v_qid := v_question_ids[v_idx];
    SELECT * INTO v_question_row FROM questions WHERE id = v_qid;
    IF NOT FOUND THEN
      CONTINUE;
    END IF;
    -- permutation mapping display index -> original index
    SELECT array_agg(x::int) FROM jsonb_array_elements_text(v_attempt.option_orders->v_qid::text) WITH ORDINALITY AS t(x, ord) ORDER BY ord INTO v_option_perm;
    -- p_answers is 0-based display index chosen; map to original
    v_original_answer := v_option_perm[ p_answers[v_idx] + 1 ];
    IF v_original_answer = v_question_row.correct_answer THEN
      v_correct := v_correct + 1;
      INSERT INTO test_question_answers(test_id, question_id, student_id, is_correct) VALUES (p_test_id, v_qid, p_student_id, true);
    ELSE
      INSERT INTO test_question_answers(test_id, question_id, student_id, is_correct) VALUES (p_test_id, v_qid, p_student_id, false);
    END IF;
  END LOOP;

  v_pct := ROUND( (v_correct::numeric / NULLIF(v_total,0)) * 100.0, 2);

  -- Upsert test_results
  SELECT * INTO v_existing_result FROM test_results WHERE test_id = p_test_id AND student_id = p_student_id;
  IF FOUND THEN
    UPDATE test_results SET score = v_pct, total_questions = v_total, time_taken = EXTRACT(EPOCH FROM (now() - v_attempt.started_at))::int, answers = to_jsonb(p_answers), completed_at = now() WHERE id = v_existing_result.id;
  ELSE
    INSERT INTO test_results(test_id, student_id, score, total_questions, time_taken, answers, completed_at)
    VALUES (p_test_id, p_student_id, v_pct, v_total, EXTRACT(EPOCH FROM (now() - v_attempt.started_at))::int, to_jsonb(p_answers), now());
  END IF;

  UPDATE test_attempts SET status = 'submitted' WHERE id = v_attempt.id;

  RETURN jsonb_build_object('status','submitted','score',v_pct);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
