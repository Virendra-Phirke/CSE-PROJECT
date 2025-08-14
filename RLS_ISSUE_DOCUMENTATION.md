# Row Level Security (RLS) Issue with Clerk Authentication

## Problem
The application is encountering a **Row Level Security policy violation** when trying to create tests:

```
Error: new row violates row-level security policy for table "tests"
Code: 42501 (Unauthorized)
```

## Root Cause
The Supabase database has Row Level Security enabled with policies that expect **Supabase Auth** (`auth.uid()`), but we're using **Clerk authentication** instead. The RLS policies check:

```sql
-- This policy expects auth.uid() to be present (Supabase Auth)
CREATE POLICY "Teachers can manage own tests"
  ON tests
  FOR ALL  
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid()  -- ❌ NULL with Clerk
      AND profiles.role = 'teacher'
      AND (tests.created_by = auth.uid() OR tests.is_active = true)  -- ❌ NULL with Clerk
    )
  );
```

Since we're using Clerk, `auth.uid()` returns `NULL`, causing all RLS checks to fail.

## Solutions

### Option 1: Disable RLS (Development/Testing)
```sql
-- Run this in Supabase SQL Editor to disable RLS temporarily
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE tests DISABLE ROW LEVEL SECURITY; 
ALTER TABLE questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE test_results DISABLE ROW LEVEL SECURITY;
```

### Option 2: Modify RLS Policies for Clerk (Recommended)
Create new policies that work without Supabase Auth:

```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Teachers can manage own tests" ON tests;
DROP POLICY IF EXISTS "Students can view active tests" ON tests;

-- Create new policies that don't rely on auth.uid()
CREATE POLICY "Allow all operations on tests" 
  ON tests 
  FOR ALL 
  TO public 
  USING (true) 
  WITH CHECK (true);

-- Or more secure: only allow authenticated requests (still no auth.uid() dependency)
CREATE POLICY "Allow authenticated operations on tests" 
  ON tests 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);
```

### Option 3: Hybrid Approach (Production)
Use Supabase's JWT verification with Clerk tokens:

1. Configure Supabase to accept Clerk JWTs
2. Pass Clerk tokens to Supabase client
3. Update RLS policies to use Clerk user IDs

## Current Status
- ✅ **UUID Issue**: Fixed with deterministic UUID generation from Clerk IDs
- ⚠️  **RLS Issue**: Needs database policy update (requires admin access)
- ✅ **Authentication**: Clerk integration working correctly
- ✅ **Frontend**: All components migrated to Clerk

## Immediate Workaround
The application now shows user-friendly error messages for RLS issues. To fully resolve:

1. **Database Admin**: Run the RLS disable script in Supabase SQL Editor
2. **Alternative**: Use Supabase service key (bypasses RLS) in development environment

## Files Modified
- ✅ `src/contexts/TestContext.tsx` - Better error handling for RLS
- ✅ `src/pages/TestCreation.tsx` - User-friendly error messages
- ✅ `src/lib/clerkUtils.ts` - UUID generation utilities
- 📄 Migration files created for reference

This is a **configuration issue**, not a code issue. The application logic is correct.
