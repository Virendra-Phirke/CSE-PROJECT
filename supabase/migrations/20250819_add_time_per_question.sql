/*
  # Add time_per_question column to tests table

  This migration adds a column to store the exact time allocated per question in seconds.
  This prevents rounding errors when calculating per-question time from total duration.

  1. Changes
    - Add `time_per_question` column (integer, optional)
    - Stores the exact seconds allocated per question as set by the teacher
*/

-- Add time_per_question column to tests table
ALTER TABLE tests 
ADD COLUMN IF NOT EXISTS time_per_question integer;

-- Add comment to document the column
COMMENT ON COLUMN tests.time_per_question IS 'Exact seconds allocated per question. Used to prevent rounding errors when duration is stored in minutes.';
