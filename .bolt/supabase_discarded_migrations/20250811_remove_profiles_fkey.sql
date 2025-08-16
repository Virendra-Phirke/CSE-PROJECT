-- Remove foreign key constraint from profiles table for Clerk integration
-- The profiles.id field was referencing auth.users(id), but we're using Clerk
-- so we don't have records in auth.users table

-- Drop the foreign key constraint
ALTER TABLE profiles DROP CONSTRAINT profiles_id_fkey;

-- The profiles table will now use standalone UUIDs generated from Clerk user IDs
-- without requiring corresponding auth.users records

-- Note: In production, you might want to:
-- 1. Create a mapping table between Clerk users and Supabase users
-- 2. Use a different field for the Clerk UUID (e.g., clerk_user_id)
-- 3. Keep the auth.users reference for Supabase-native features
