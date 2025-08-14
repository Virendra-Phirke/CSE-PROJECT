/*
  # MCQ Application Database Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, references auth.users)
      - `name` (text)
      - `email` (text)
      - `role` (enum: teacher, student)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `tests`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `duration` (integer, minutes)
      - `start_date` (timestamp)
      - `end_date` (timestamp)
      - `is_active` (boolean)
      - `created_by` (uuid, references profiles)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `questions`
      - `id` (uuid, primary key)
      - `test_id` (uuid, references tests)
      - `question_text` (text)
      - `options` (jsonb array)
      - `correct_answer` (integer)
      - `order_index` (integer)
      - `created_at` (timestamp)
    
    - `test_results`
      - `id` (uuid, primary key)
      - `test_id` (uuid, references tests)
      - `student_id` (uuid, references profiles)
      - `score` (numeric)
      - `total_questions` (integer)
      - `time_taken` (integer, seconds)
      - `answers` (jsonb array)
      - `completed_at` (timestamp)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users based on roles
    - Teachers can manage their own tests and view all results
    - Students can view available tests and their own results
*/

-- Create custom types
CREATE TYPE user_role AS ENUM ('teacher', 'student');

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'student',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create tests table
CREATE TABLE IF NOT EXISTS tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  duration integer NOT NULL DEFAULT 30,
  start_date timestamptz DEFAULT now(),
  end_date timestamptz DEFAULT (now() + interval '7 days'),
  is_active boolean DEFAULT true,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]',
  correct_answer integer NOT NULL DEFAULT 0,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create test_results table
CREATE TABLE IF NOT EXISTS test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score numeric(5,2) NOT NULL DEFAULT 0,
  total_questions integer NOT NULL DEFAULT 0,
  time_taken integer NOT NULL DEFAULT 0,
  answers jsonb NOT NULL DEFAULT '[]',
  completed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(test_id, student_id)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Tests policies
CREATE POLICY "Teachers can manage own tests"
  ON tests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'teacher'
      AND (tests.created_by = auth.uid() OR tests.is_active = true)
    )
  );

CREATE POLICY "Students can view active tests"
  ON tests
  FOR SELECT
  TO authenticated
  USING (
    is_active = true 
    AND start_date <= now() 
    AND end_date >= now()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'student'
    )
  );

-- Questions policies
CREATE POLICY "Teachers can manage questions for own tests"
  ON questions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tests 
      JOIN profiles ON profiles.id = auth.uid()
      WHERE tests.id = questions.test_id 
      AND tests.created_by = auth.uid()
      AND profiles.role = 'teacher'
    )
  );

CREATE POLICY "Students can view questions for active tests"
  ON questions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tests 
      JOIN profiles ON profiles.id = auth.uid()
      WHERE tests.id = questions.test_id 
      AND tests.is_active = true
      AND tests.start_date <= now() 
      AND tests.end_date >= now()
      AND profiles.role = 'student'
    )
  );

-- Test results policies
CREATE POLICY "Teachers can view results for own tests"
  ON test_results
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tests 
      JOIN profiles ON profiles.id = auth.uid()
      WHERE tests.id = test_results.test_id 
      AND tests.created_by = auth.uid()
      AND profiles.role = 'teacher'
    )
  );

CREATE POLICY "Students can manage own results"
  ON test_results
  FOR ALL
  TO authenticated
  USING (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'student'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tests_created_by ON tests(created_by);
CREATE INDEX IF NOT EXISTS idx_tests_active ON tests(is_active, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_questions_test_id ON questions(test_id);
CREATE INDEX IF NOT EXISTS idx_questions_order ON questions(test_id, order_index);
CREATE INDEX IF NOT EXISTS idx_test_results_test_id ON test_results(test_id);
CREATE INDEX IF NOT EXISTS idx_test_results_student_id ON test_results(student_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tests_updated_at 
  BEFORE UPDATE ON tests 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();