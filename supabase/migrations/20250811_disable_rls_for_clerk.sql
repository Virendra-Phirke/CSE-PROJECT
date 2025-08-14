-- Temporarily disable RLS for Clerk integration testing
-- This allows the app to work while we're using Clerk instead of Supabase Auth

-- Disable RLS on all tables
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE tests DISABLE ROW LEVEL SECURITY; 
ALTER TABLE questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE test_results DISABLE ROW LEVEL SECURITY;

-- Drop existing policies (we can recreate them later if needed)
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles; 
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Teachers can manage own tests" ON tests;
DROP POLICY IF EXISTS "Students can view active tests" ON tests;
DROP POLICY IF EXISTS "Teachers can manage questions for own tests" ON questions;
DROP POLICY IF EXISTS "Students can view questions for active tests" ON questions;
DROP POLICY IF EXISTS "Teachers can view results for own tests" ON test_results;
DROP POLICY IF EXISTS "Students can manage own results" ON test_results;

-- Add comment explaining the change
COMMENT ON TABLE tests IS 'RLS disabled for Clerk integration. Using application-level auth checks instead.';
