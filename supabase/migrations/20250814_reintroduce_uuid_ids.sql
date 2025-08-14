-- Migration: Reintroduce strict UUID columns while preserving legacy Clerk TEXT IDs (Option A)
-- Date: 2025-08-14
-- Strategy:
--  1. Add parallel UUID columns (id_uuid / created_by_uuid / student_id_uuid)
--  2. Deterministically hash any legacy Clerk IDs (user_*) into UUIDs (matches frontend JS logic)
--  3. Re-link tests & test_results via new UUID FKs
--  4. Swap columns (rename) so application code can continue using created_by / student_id / id
--  5. Preserve legacy TEXT columns with *_legacy_text suffix for rollback / verification
--  6. Recreate constraints & indexes on new UUID columns
--  7. (Optional post‑deploy) Drop legacy columns after validation

BEGIN;

-- Safety: ensure pgcrypto for SHA-256
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Deterministic hash -> UUID (mirrors src/lib/clerkUtils.ts generateUUIDFromClerkId)
-- JS logic:
--   hashHex = sha256(clerkId) (hex, 64 chars)
--   uuid = hashHex[0:8] + '-' + hashHex[8:12] + '-4' + hashHex[13:16] + '-8' + hashHex[17:20] + '-' + hashHex[20:32]
CREATE OR REPLACE FUNCTION clerk_hash_uuid(clerk_id text) RETURNS uuid AS $$
DECLARE
  hx text := encode(digest(clerk_id, 'sha256'), 'hex');
BEGIN
  RETURN (
    substring(hx from 1  for 8) || '-' ||
    substring(hx from 9  for 4) || '-' ||
    '4' || substring(hx from 14 for 3) || '-' ||
    '8' || substring(hx from 18 for 3) || '-' ||
    substring(hx from 21 for 12)
  )::uuid;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 1. Add parallel UUID columns if not already present
ALTER TABLE profiles      ADD COLUMN IF NOT EXISTS id_uuid uuid;
ALTER TABLE tests         ADD COLUMN IF NOT EXISTS created_by_uuid uuid;
ALTER TABLE test_results  ADD COLUMN IF NOT EXISTS student_id_uuid uuid;

-- 2. Backfill profiles.id_uuid
UPDATE profiles
SET id_uuid = CASE
  WHEN id_uuid IS NOT NULL THEN id_uuid
  WHEN id ~ '^[0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12}$' THEN id::uuid  -- already a uuid string (likely deterministic hash stored earlier)
  ELSE clerk_hash_uuid(id)  -- legacy Clerk raw id (e.g., user_...)
END
WHERE id_uuid IS NULL;

-- 3. Backfill child tables using the mapping
UPDATE tests t
SET created_by_uuid = p.id_uuid
FROM profiles p
WHERE t.created_by_uuid IS NULL
  AND t.created_by = p.id;

UPDATE test_results r
SET student_id_uuid = p.id_uuid
FROM profiles p
WHERE r.student_id_uuid IS NULL
  AND r.student_id = p.id;

-- 4. Ensure no nulls remain (abort if any could not map)
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM profiles WHERE id_uuid IS NULL) THEN
    RAISE EXCEPTION 'Aborting: some profiles rows missing id_uuid';
  END IF;
  IF EXISTS(SELECT 1 FROM tests WHERE created_by_uuid IS NULL) THEN
    RAISE EXCEPTION 'Aborting: some tests rows missing created_by_uuid (orphan created_by)';
  END IF;
  IF EXISTS(SELECT 1 FROM test_results WHERE student_id_uuid IS NULL) THEN
    RAISE EXCEPTION 'Aborting: some test_results rows missing student_id_uuid (orphan student_id)';
  END IF;
END $$;

-- 5. Drop any old FKs / constraints that might conflict during swap (best-effort)
ALTER TABLE tests        DROP CONSTRAINT IF EXISTS tests_created_by_fkey;
ALTER TABLE test_results DROP CONSTRAINT IF EXISTS test_results_student_id_fkey;
-- Unique constraint on (test_id, student_id) will be recreated; drop if exists before renaming
ALTER TABLE test_results DROP CONSTRAINT IF EXISTS test_results_test_id_student_id_key;

-- 6. Swap columns (rename legacy TEXT -> *_legacy_text, UUID -> original name)
-- Profiles primary key needs to be adjusted
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_pkey;
ALTER TABLE profiles RENAME COLUMN id TO id_legacy_text;
ALTER TABLE profiles RENAME COLUMN id_uuid TO id;
ALTER TABLE profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

ALTER TABLE tests RENAME COLUMN created_by TO created_by_legacy_text;
ALTER TABLE tests RENAME COLUMN created_by_uuid TO created_by;

ALTER TABLE test_results RENAME COLUMN student_id TO student_id_legacy_text;
ALTER TABLE test_results RENAME COLUMN student_id_uuid TO student_id;

-- 7. Recreate foreign keys using new UUID columns
ALTER TABLE tests
  ADD CONSTRAINT tests_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE test_results
  ADD CONSTRAINT test_results_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 8. Recreate unique constraint on (test_id, student_id)
ALTER TABLE test_results
  ADD CONSTRAINT test_results_test_id_student_id_key UNIQUE (test_id, student_id);

-- 9. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_tests_created_by ON tests(created_by);
CREATE INDEX IF NOT EXISTS idx_test_results_student_id ON test_results(student_id);

-- 10. Set NOT NULL on new UUID columns (now active names)
ALTER TABLE profiles     ALTER COLUMN id SET NOT NULL;
ALTER TABLE tests        ALTER COLUMN created_by SET NOT NULL;
ALTER TABLE test_results ALTER COLUMN student_id SET NOT NULL;

-- 11. (Optional) Add commentary
COMMENT ON COLUMN profiles.id IS 'Deterministic UUID derived from Clerk user id (see clerk_hash_uuid). Legacy TEXT id preserved in id_legacy_text.';
COMMENT ON COLUMN profiles.id_legacy_text IS 'Legacy Clerk TEXT id (user_*) retained temporarily for rollback; do not use for new relations.';
COMMENT ON COLUMN tests.created_by IS 'UUID FK to profiles.id (deterministic from Clerk). Original TEXT in created_by_legacy_text.';
COMMENT ON COLUMN test_results.student_id IS 'UUID FK to profiles.id (deterministic from Clerk). Original TEXT in student_id_legacy_text.';

COMMIT;

-- Post-deploy validation queries (run manually):
-- SELECT COUNT(*) FROM profiles WHERE id_legacy_text LIKE 'user_%';
-- SELECT id, id_legacy_text FROM profiles LIMIT 10;
-- SELECT created_by, created_by_legacy_text FROM tests ORDER BY created_at DESC LIMIT 10;
-- SELECT student_id, student_id_legacy_text FROM test_results ORDER BY created_at DESC LIMIT 10;
-- If satisfied, you may later drop legacy columns:
--   ALTER TABLE test_results DROP COLUMN student_id_legacy_text;
--   ALTER TABLE tests DROP COLUMN created_by_legacy_text;
--   ALTER TABLE profiles DROP COLUMN id_legacy_text;
