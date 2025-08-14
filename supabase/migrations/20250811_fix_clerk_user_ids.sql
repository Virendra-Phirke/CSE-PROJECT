-- Migration to fix Clerk user ID compatibility
-- Change user ID fields from UUID to TEXT to support Clerk user IDs

-- First, drop foreign key constraints
ALTER TABLE tests DROP CONSTRAINT IF EXISTS tests_created_by_fkey;
ALTER TABLE test_results DROP CONSTRAINT IF EXISTS test_results_student_id_fkey;

-- Change created_by column in tests table to TEXT
ALTER TABLE tests ALTER COLUMN created_by TYPE TEXT;

-- Change student_id column in test_results table to TEXT  
ALTER TABLE test_results ALTER COLUMN student_id TYPE TEXT;

-- Update profiles table to use TEXT for id (Clerk user IDs)
ALTER TABLE profiles ALTER COLUMN id TYPE TEXT;

-- Add comments for clarity
COMMENT ON COLUMN tests.created_by IS 'Clerk user ID of the teacher who created the test';
COMMENT ON COLUMN test_results.student_id IS 'Clerk user ID of the student who took the test';
COMMENT ON COLUMN profiles.id IS 'Clerk user ID';
