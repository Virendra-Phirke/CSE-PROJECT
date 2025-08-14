-- Disable RLS for profiles table for Clerk integration
-- This is needed because Clerk users don't have Supabase auth.uid()
-- and the existing RLS policies rely on auth.uid() = id

-- Disable RLS on profiles table
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- For production, you would want to create custom RLS policies that work with Clerk
-- or implement a different security model
-- 
-- Example of how you might handle this in production:
-- 1. Use Supabase service role key for profile operations
-- 2. Create a secure API endpoint that validates Clerk tokens
-- 3. Use Supabase RPC functions with security definer
-- 4. Implement application-level security checks
