import { useQuery, QueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useUser } from '@clerk/clerk-react';
import { getCachedUUIDFromClerkId, ensureUserProfile } from '../lib/clerkUtils';
import { canonicalizeRole } from '../lib/roleUtils';
import type { LegacyTest, LegacyTestResult } from '../contexts/TestContext';
import type { Question } from '../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

interface TestRow {
  id: string; title: string; description: string; duration: number; time_per_question?: number; created_by: string; start_date: string; end_date: string; is_active: boolean; questions: Question[];
}
interface ResultRow {
  id: string; test_id: string; student_id: string; score: number; total_questions: number; time_taken: number; answers: number[]; completed_at: string; student?: { name?: string } | null;
}

// Helper to convert DB test -> LegacyTest shape
async function fetchTests(user: ReturnType<typeof useUser>['user']): Promise<LegacyTest[]> {
  if (!user) return [];
  const role = canonicalizeRole(user.unsafeMetadata?.role as string | undefined) || 'student';
  await ensureUserProfile(user, role as 'teacher' | 'student');

  let query = supabase
    .from('tests')
    .select(`*, questions ( id, question_text, options, correct_answer, order_index )`);

  if (role === 'student') {
    query = query.eq('is_active', true);
  }
  const { data: testsData, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  const legacyTests: LegacyTest[] = (testsData as unknown as TestRow[])?.map((test) => ({
    id: test.id,
    title: test.title,
    description: test.description,
    duration: test.duration,
    timePerQuestion: test.time_per_question, // Read exact time per question from database
    createdBy: test.created_by,
    startDate: test.start_date,
    endDate: test.end_date,
    isActive: test.is_active,
    questions: test.questions
      ?.sort((a: Question, b: Question) => a.order_index - b.order_index)
      .map((q: Question) => ({
        id: q.id,
        question: q.question_text,
        options: q.options,
        correctAnswer: q.correct_answer
      })) || []
  })) || [];
  return legacyTests;
}

async function fetchResults(user: ReturnType<typeof useUser>['user'], tests: LegacyTest[] | undefined): Promise<LegacyTestResult[]> {
  if (!user) return [];
  const role = canonicalizeRole(user.unsafeMetadata?.role as string | undefined) || 'student';
  const userUUID = await getCachedUUIDFromClerkId(user.id);
  let query = supabase
    .from('test_results')
    .select(`
      id, test_id, student_id, score, total_questions, time_taken, answers, completed_at, created_at,
      test:tests(title),
      student:profiles(name)
    `);
  if (role === 'student') {
    query = query.eq('student_id', userUUID);
  } else {
    const teacherTests = (tests || []).filter(t => t.createdBy === userUUID);
    if (teacherTests.length === 0) return [];
    query = query.in('test_id', teacherTests.map(t => t.id));
  }
  const { data: resultsData, error } = await query.order('completed_at', { ascending: false });
  if (error) throw error;
  const legacyResults: LegacyTestResult[] = (resultsData as unknown as ResultRow[])?.map((result) => ({
    id: result.id,
    testId: result.test_id,
    studentId: result.student_id,
    studentName: (result.student as any)?.name || 'Unknown Student',
    score: result.score,
    totalQuestions: result.total_questions,
    timeTaken: result.time_taken,
    answers: result.answers,
    completedAt: result.completed_at
  })) || [];
  return legacyResults;
}

export function useTestsQuery() {
  const { user } = useUser();
  return useQuery({
    queryKey: ['tests', user?.id],
    queryFn: () => fetchTests(user),
    enabled: !!user,
    staleTime: 60_000
  });
}

export function useResultsQuery(tests: LegacyTest[] | undefined) {
  const { user } = useUser();
  return useQuery({
    queryKey: ['results', user?.id, (tests || []).map(t => t.id).join(',')],
    queryFn: () => fetchResults(user, tests),
    enabled: !!user && !!tests,
    staleTime: 30_000
  });
}

export async function fetchQuestionStatsRaw(testId: string) {
  const { data, error } = await supabase
    .from('test_question_answers')
    .select('question_id, is_correct')
    .eq('test_id', testId);
  
  // Handle 404 or other errors gracefully - return empty stats if no data exists
  if (error) {
    console.warn(`No question stats found for test ${testId}:`, error.message);
    return [];
  }
  
  const map = new Map<string, { correct: number; total: number }>();
  data?.forEach(row => {
    const qid = row.question_id as string;
    if (!map.has(qid)) map.set(qid, { correct: 0, total: 0 });
    const agg = map.get(qid)!;
    agg.total += 1;
    if (row.is_correct) agg.correct += 1;
  });
  return Array.from(map.entries()).map(([questionId, v]) => ({
    questionId,
    correct: v.correct,
    total: v.total,
    accuracy: v.total ? v.correct / v.total : 0
  }));
}

export function getQuestionStatsQueryOptions(testId: string) {
  return {
    queryKey: ['question-stats', testId],
    queryFn: () => fetchQuestionStatsRaw(testId),
    staleTime: 15_000
  } as const;
}

export function prefetchQuestionStats(queryClient: QueryClient, testId: string) {
  return queryClient.prefetchQuery(getQuestionStatsQueryOptions(testId));
}

export function useQuestionStatsQuery(testId: string | undefined, enabled: boolean = true) {
  return useQuery({
    ...(testId ? getQuestionStatsQueryOptions(testId) : { queryKey: ['question-stats', 'none'], queryFn: async () => [] }),
    enabled: !!testId && enabled
  });
}

async function fetchSingleTest(user: ReturnType<typeof useUser>['user'], testId: string): Promise<LegacyTest | undefined> {
  if (!user) return undefined;
  const role = canonicalizeRole(user.unsafeMetadata?.role as string | undefined) || 'student';
  await ensureUserProfile(user, role as 'teacher' | 'student');
  const query = supabase
    .from('tests')
    .select(`*, questions ( id, question_text, options, correct_answer, order_index )`)
    .eq('id', testId)
    .limit(1)
    .single();
  const { data, error } = await query;
  if (error) {
    if (error.code === 'PGRST116') return undefined; // not found
    throw error;
  }
  const test = data as unknown as TestRow;
  return {
    id: test.id,
    title: test.title,
    description: test.description,
    duration: test.duration,
    timePerQuestion: test.time_per_question, // Read exact time per question from database
    createdBy: test.created_by,
    startDate: test.start_date,
    endDate: test.end_date,
    isActive: test.is_active,
    questions: test.questions
      ?.sort((a: Question, b: Question) => a.order_index - b.order_index)
      .map((q: Question) => ({
        id: q.id,
        question: q.question_text,
        options: q.options,
        correctAnswer: q.correct_answer
      })) || []
  } as LegacyTest;
}

export function useTestQuery(testId: string | undefined) {
  const { user } = useUser();
  const queryClient = useQueryClient();
  return useQuery<LegacyTest | undefined>({
    queryKey: ['test', testId, user?.id],
    queryFn: () => fetchSingleTest(user, testId as string),
    enabled: !!user && !!testId,
    initialData: () => {
      if (!testId) return undefined;
      const tests = queryClient.getQueryData<LegacyTest[]>(['tests', user?.id]);
      return tests?.find(t => t.id === testId);
    },
    staleTime: 30_000
  });
}

// --- Attempt (in-progress) query ---
export interface AttemptState {
  attemptId?: string;
  startedAt?: string;
  status?: string;
  questionOrder?: string[];
  optionOrders?: Record<string, number[]>;
}

async function fetchAttempt(user: ReturnType<typeof useUser>['user'], testId: string): Promise<AttemptState | undefined> {
  if (!user) return undefined;
  const role = canonicalizeRole(user.unsafeMetadata?.role as string | undefined) || 'student';
  await ensureUserProfile(user, role as 'teacher' | 'student');
  const userUUID = await getCachedUUIDFromClerkId(user.id);
  const { data, error } = await supabase
    .from('test_attempts')
    .select('id, test_id, student_id, started_at, status, question_order, option_orders')
    .eq('test_id', testId)
    .eq('student_id', userUUID)
    .order('started_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  const row = (data || [])[0];
  if (!row) return undefined;
  return {
    attemptId: row.id as string,
    startedAt: row.started_at as string,
    status: row.status as string,
    questionOrder: Array.isArray(row.question_order) ? (row.question_order as string[]).map(x => String(x)) : undefined,
    optionOrders: row.option_orders ? (Object.fromEntries(Object.entries(row.option_orders as Record<string, unknown>).map(([k, v]) => {
      const arr = Array.isArray(v) ? v : [];
      return [k, arr.map(x => Number(x))];
    })) as Record<string, number[]>) : undefined
  };
}

export function useAttemptQuery(testId: string | undefined) {
  const { user } = useUser();
  return useQuery<AttemptState | undefined>({
    queryKey: ['attempt', testId, user?.id],
    queryFn: () => fetchAttempt(user, testId as string),
    enabled: !!user && !!testId && (canonicalizeRole(user.unsafeMetadata?.role as string | undefined) === 'student'),
    staleTime: 5_000 // keep relatively fresh for timing
  });
}
