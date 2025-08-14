import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fallback for development if env vars are not set
const defaultUrl = 'https://placeholder.supabase.co';
const defaultKey = 'placeholder-key';

console.log('Supabase URL:', supabaseUrl || 'Not set - using placeholder');

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables - using placeholders for development');
}

export const supabase = createClient(supabaseUrl || defaultUrl, supabaseAnonKey || defaultKey);

// Database types
export interface Profile {
  id: string;
  name: string;
  email: string;
  role: 'teacher' | 'student';
  created_at: string;
  updated_at: string;
}

export interface Test {
  id: string;
  title: string;
  description: string;
  duration: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  questions?: Question[];
  creator?: Profile;
}

export interface Question {
  id: string;
  test_id: string;
  question_text: string;
  options: string[];
  correct_answer: number;
  order_index: number;
  created_at: string;
}

export interface TestResult {
  id: string;
  test_id: string;
  student_id: string;
  score: number;
  total_questions: number;
  time_taken: number;
  answers: number[];
  completed_at: string;
  created_at: string;
  test?: Test;
  student?: Profile;
}