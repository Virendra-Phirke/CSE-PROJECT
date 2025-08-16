-- Migration: Reinstate RLS with deterministic UUIDs + per-question answer analytics
-- Date: 2025-08-14
-- Phases:
--  1. Enable RLS on all core tables (was disabled during Clerk UUID migration)
--  2. Create policies for profiles, tests, questions, test_attempts, test_results
--  3. Add new table test_question_answers for per-question analytics
--  4. Policies for new analytics table
-- NOTE: Adjust as needed for performance (indexes) & future teacher analytics.

BEGIN;

-- 1. Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_attempts ENABLE ROW LEVEL SECURITY;

-- 2. Drop any existing conflicting policies (idempotent cleanup)
DO $$ DECLARE r record; BEGIN
  FOR r IN (
    SELECT polname, tablename FROM pg_policies WHERE schemaname='public' AND tablename IN ('profiles','tests','questions','test_results','test_attempts')
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.polname, r.tablename);
  END LOOP;
END $$;

-- PROFILES
-- Students & teachers can select own profile
CREATE POLICY profiles_select_own ON profiles FOR SELECT TO authenticated USING (id = auth.uid());
-- Teachers can select participant profiles for tests they own (for joins on results)
CREATE POLICY profiles_select_participants_for_teacher ON profiles FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM tests t
    JOIN test_results tr ON tr.test_id = t.id AND tr.student_id = profiles.id
    WHERE t.created_by = auth.uid()
  ) OR id = auth.uid()
);
-- Insert / update own profile
CREATE POLICY profiles_insert_own ON profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY profiles_update_own ON profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- TESTS
-- Teachers manage own tests (all actions)
CREATE POLICY tests_teacher_manage ON tests FOR ALL TO authenticated USING (created_by = auth.uid() AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role='teacher')) WITH CHECK (created_by = auth.uid());
-- Students select only active & in window tests
CREATE POLICY tests_student_select_active ON tests FOR SELECT TO authenticated USING (
  is_active = true AND start_date <= now() AND end_date >= now() AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role='student')
);
-- Teachers can also select their own inactive tests for viewing
CREATE POLICY tests_teacher_select_own ON tests FOR SELECT TO authenticated USING (created_by = auth.uid());

-- QUESTIONS
-- Teachers manage questions of tests they own
CREATE POLICY questions_teacher_manage ON questions FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM tests t WHERE t.id = questions.test_id AND t.created_by = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM tests t WHERE t.id = questions.test_id AND t.created_by = auth.uid())
);
-- Students select questions only for active tests in window
CREATE POLICY questions_student_select ON questions FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM tests t WHERE t.id = questions.test_id AND t.is_active = true AND t.start_date <= now() AND t.end_date >= now()
  )
);

-- TEST_ATTEMPTS
-- Students can insert/select/update their attempt while in_progress
CREATE POLICY attempts_student_insert ON test_attempts FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());
CREATE POLICY attempts_student_select ON test_attempts FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY attempts_student_update ON test_attempts FOR UPDATE TO authenticated USING (student_id = auth.uid() AND status='in_progress') WITH CHECK (student_id = auth.uid());
-- Teachers can select attempts for their tests (future proctoring)
CREATE POLICY attempts_teacher_select ON test_attempts FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM tests t WHERE t.id = test_attempts.test_id AND t.created_by = auth.uid())
);

-- TEST_RESULTS
-- Students manage (select) their own results
CREATE POLICY results_student_select ON test_results FOR SELECT TO authenticated USING (student_id = auth.uid());
-- Teachers view results for their tests
CREATE POLICY results_teacher_select ON test_results FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM tests t WHERE t.id = test_results.test_id AND t.created_by = auth.uid())
);
-- Allow student insert of their own result (RPC path still recommended)
CREATE POLICY results_student_insert ON test_results FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());

-- 3. Per-question analytics table
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

CREATE INDEX IF NOT EXISTS idx_tqa_attempt ON test_question_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_tqa_test ON test_question_answers(test_id);
CREATE INDEX IF NOT EXISTS idx_tqa_question ON test_question_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_tqa_student ON test_question_answers(student_id);
CREATE INDEX IF NOT EXISTS idx_tqa_test_question ON test_question_answers(test_id, question_id);

ALTER TABLE test_question_answers ENABLE ROW LEVEL SECURITY;

-- Policies for analytics table
CREATE POLICY tqa_student_select ON test_question_answers FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY tqa_teacher_select ON test_question_answers FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM tests t WHERE t.id = test_question_answers.test_id AND t.created_by = auth.uid())
);
-- Insert limited to student's own answers (done via RPC after scoring)
CREATE POLICY tqa_student_insert ON test_question_answers FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());

COMMENT ON TABLE test_question_answers IS 'Per-question answer analytics captured at submission time.';

COMMIT;
