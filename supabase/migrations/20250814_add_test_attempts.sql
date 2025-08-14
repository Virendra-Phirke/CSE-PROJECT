-- Migration: Add test_attempts table for attempt tracking and server-side timing
-- Date: 2025-08-14
-- Purpose: Track when a student starts an attempt to enforce duration & prevent duplicate submissions

BEGIN;

CREATE TABLE IF NOT EXISTS test_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','submitted','abandoned')),
  client_started_at timestamptz, -- optional client timestamp for drift analysis
  UNIQUE(test_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_test_attempts_test_id ON test_attempts(test_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_student_id ON test_attempts(student_id);

COMMENT ON TABLE test_attempts IS 'Tracks test attempt lifecycle for duration enforcement and duplicate prevention.';

COMMIT;
