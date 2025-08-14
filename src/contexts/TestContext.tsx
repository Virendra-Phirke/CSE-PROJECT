import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useTestsQuery, useResultsQuery } from '../hooks/quizQueries';
import { supabase } from '../lib/supabase';
import { useUser } from '@clerk/clerk-react';
import { getCachedUUIDFromClerkId, ensureUserProfile } from '../lib/clerkUtils';
import { useQueryClient } from '@tanstack/react-query';
import { getQuestionStatsQueryOptions } from '../hooks/quizQueries';

// Legacy interface for backward compatibility
export interface LegacyQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface LegacyTest {
  id: string;
  title: string;
  description: string;
  questions: LegacyQuestion[];
  duration: number;
  createdBy: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface LegacyTestResult {
  id: string;
  testId: string;
  studentId: string;
  studentName: string;
  score: number;
  totalQuestions: number;
  timeTaken: number;
  answers: number[];
  completedAt: string;
}

// Added richer attempt metadata types
export interface AttemptState {
  attemptId?: string;
  startedAt?: string;
  status?: string;
  questionOrder?: string[]; // ordered list of question UUIDs
  optionOrders?: Record<string, number[]>; // question_id -> array mapping display index -> original option index
}

interface TestContextType {
  tests: LegacyTest[];
  results: LegacyTestResult[];
  createTest: (test: Omit<LegacyTest, 'id'>) => Promise<void>;
  updateTest: (id: string, test: Omit<LegacyTest, 'id'>) => Promise<void>;
  deleteTest: (id: string) => Promise<void>;
  toggleTestStatus: (id: string) => Promise<void>;
  submitTestResult: (result: Omit<LegacyTestResult, 'id'>) => Promise<void>; // legacy
  getTestById: (id: string) => LegacyTest | undefined;
  getResultsByTestId: (testId: string) => LegacyTestResult[];
  getResultsByStudentId: (studentId: string) => LegacyTestResult[];
  generateTestLink: (testId: string) => string;
  loading: boolean;
  refreshTests: () => Promise<void>;
  refreshResults: () => Promise<void>;
  startTestAttempt: (testId: string) => Promise<AttemptState | null>;
  submitTestResultServer: (params: { testId: string; answers: number[] }) => Promise<void>;
  attempt: AttemptState | null;
  fetchQuestionStats: (testId: string) => Promise<Array<{ questionId: string; correct: number; total: number; accuracy: number }>>;
}

const TestContext = createContext<TestContextType | undefined>(undefined);

export { TestContext };

export function TestProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const testsQuery = useTestsQuery();
  const resultsQuery = useResultsQuery(testsQuery.data);
  const [attempt, setAttempt] = useState<AttemptState | null>(null);

  const tests = useMemo(() => testsQuery.data || [], [testsQuery.data]);
  const results = useMemo(() => resultsQuery.data || [], [resultsQuery.data]);
  const loading = testsQuery.isLoading || resultsQuery.isLoading; // composite loading

  // Legacy refresh functions now just invalidate queries
  const refreshTests = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['tests'] });
  }, [queryClient]);
  const refreshResults = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['results'] });
  }, [queryClient]);

  const createTest = async (testData: Omit<LegacyTest, 'id'>) => {
    if (!user) return;

    // Check if Supabase is properly configured
    if (!import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL.includes('placeholder')) {
      console.error('Supabase not configured properly');
      alert('Database not configured. Please set up Supabase connection.');
      return;
    }

    try {
      const userRole = (user.unsafeMetadata?.role as string) || 'teacher';
      await ensureUserProfile(user, userRole as 'teacher' | 'student');
      const userUUID = await getCachedUUIDFromClerkId(user.id);

      const { data: testResult, error: testError } = await supabase
        .from('tests')
        .insert({
          title: testData.title,
          description: testData.description,
          duration: testData.duration,
          start_date: testData.startDate,
          end_date: testData.endDate,
          is_active: testData.isActive,
          created_by: userUUID
        })
        .select()
        .single();

      if (testError) throw testError;

      if (testData.questions.length > 0) {
        const questionsToInsert = testData.questions.map((q, index) => ({
          test_id: testResult.id,
          question_text: q.question,
          options: q.options,
          correct_answer: q.correctAnswer,
          order_index: index
        }));

        const { error: questionsError } = await supabase
          .from('questions')
          .insert(questionsToInsert);

        if (questionsError) throw questionsError;
      }

      await refreshTests();
    } catch (error) {
      console.error('Error creating test:', error);
      alert('Failed to create test. Please check your database connection.');
      throw error;
    }
  };

  const updateTest = async (testId: string, testData: Omit<LegacyTest, 'id'>) => {
    if (!user) return;

    try {
      const userRole = (user.unsafeMetadata?.role as string) || 'student';
      await ensureUserProfile(user, userRole as 'teacher' | 'student');
      const userUUID = await getCachedUUIDFromClerkId(user.id);

      // 1. Update test level metadata (always safe / cheap)
      const { error: testError } = await supabase
        .from('tests')
        .update({
          title: testData.title,
          description: testData.description,
          duration: testData.duration,
          start_date: testData.startDate,
          end_date: testData.endDate,
          is_active: testData.isActive
        })
        .eq('id', testId)
        .eq('created_by', userUUID);

      if (testError) throw testError;

      // 2. Fetch existing questions for diffing (id, content, order)
      const { data: existing, error: existingErr } = await supabase
        .from('questions')
        .select('id, question_text, options, correct_answer, order_index')
        .eq('test_id', testId)
        .order('order_index', { ascending: true });
      if (existingErr) throw existingErr;

      const existingMap = new Map<string, { question_text: string; options: string[]; correct_answer: number; order_index: number }>();
      (existing || []).forEach(q => existingMap.set(q.id as string, {
        question_text: q.question_text as string,
        options: q.options as string[],
        correct_answer: q.correct_answer as number,
        order_index: q.order_index as number
      }));

      // Helper to identify UUID (very lightweight check)
      const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

      const toInsert: Array<{ test_id: string; question_text: string; options: string[]; correct_answer: number; order_index: number }> = [];
      const toUpsert: Array<{ id: string; test_id: string; question_text: string; options: string[]; correct_answer: number; order_index: number }> = [];

      const newIds = new Set<string>();

      testData.questions.forEach((q, index) => {
        const desired = {
          question_text: q.question,
            options: q.options,
            correct_answer: q.correctAnswer,
            order_index: index
        };
        const have = existingMap.get(q.id);
        if (!have || !isUUID(q.id)) {
          // New question (no valid UUID or not found)
          toInsert.push({ test_id: testId, ...desired });
        } else {
          // Existing: include in upsert only if something changed (content or order)
          const changed = have.question_text !== desired.question_text ||
            JSON.stringify(have.options) !== JSON.stringify(desired.options) ||
            have.correct_answer !== desired.correct_answer ||
            have.order_index !== desired.order_index;
          if (changed) {
            toUpsert.push({ id: q.id, test_id: testId, ...desired });
          }
          newIds.add(q.id);
        }
      });

      // Anything existing but not referenced anymore must be deleted
      const toDelete = (existing || [])
        .map(q => q.id as string)
        .filter(id => !newIds.has(id));

      // 3. Perform batched mutations (delete -> upsert -> insert) to avoid unique/order conflicts
      if (toDelete.length > 0) {
        const { error: delErr } = await supabase.from('questions').delete().in('id', toDelete);
        if (delErr) throw delErr;
      }
      if (toUpsert.length > 0) {
        const { error: upErr } = await supabase.from('questions').upsert(toUpsert, { onConflict: 'id' });
        if (upErr) throw upErr;
      }
      if (toInsert.length > 0) {
        const { error: insErr } = await supabase.from('questions').insert(toInsert);
        if (insErr) throw insErr;
      }

      await refreshTests();
    } catch (error) {
      console.error('Error updating test (partial patch):', error);
      throw error;
    }
  };

  const deleteTest = async (testId: string) => {
    if (!user) return;

    try {
      const userUUID = await getCachedUUIDFromClerkId(user.id);

      const { error } = await supabase
        .from('tests')
        .delete()
        .eq('id', testId)
        .eq('created_by', userUUID);

      if (error) throw error;

      await refreshTests();
    } catch (error) {
      console.error('Error deleting test:', error);
      throw error;
    }
  };

  const toggleTestStatus = async (testId: string) => {
    if (!user) return;

    try {
      const userUUID = await getCachedUUIDFromClerkId(user.id);

      const currentTest = tests.find(t => t.id === testId && t.createdBy === userUUID);
      if (!currentTest) {
        throw new Error('Test not found or you do not have permission to modify it');
      }

      const { error } = await supabase
        .from('tests')
        .update({ is_active: !currentTest.isActive })
        .eq('id', testId)
        .eq('created_by', userUUID);

      if (error) throw error;

      await refreshTests();
    } catch (error) {
      console.error('Error toggling test status:', error);
      throw error;
    }
  };

  const submitTestResult = async (resultData: Omit<LegacyTestResult, 'id'>) => {
    if (!user) return;

    try {
      const userRole = (user.unsafeMetadata?.role as string) || 'student';
      await ensureUserProfile(user, userRole as 'teacher' | 'student');
      const userUUID = await getCachedUUIDFromClerkId(user.id);

      const { error } = await supabase
        .from('test_results')
        .insert({
          test_id: resultData.testId,
          student_id: userUUID,
          score: resultData.score,
          total_questions: resultData.totalQuestions,
          time_taken: resultData.timeTaken,
          answers: resultData.answers,
          completed_at: resultData.completedAt
        });

      if (error) throw error;

      await refreshResults();
      await queryClient.invalidateQueries({ queryKey: ['question-stats', resultData.testId] });
    } catch (error) {
      console.error('Error submitting test result:', error);
      throw error;
    }
  };

  const startTestAttempt = async (testId: string) => {
    if (!user) return null;
    try {
      const userRole = (user.unsafeMetadata?.role as string) || 'student';
      await ensureUserProfile(user, userRole as 'teacher' | 'student');
      const userUUID = await getCachedUUIDFromClerkId(user.id);
      const { data, error } = await supabase.rpc('start_test_attempt', {
        p_test_id: testId,
        p_student_id: userUUID
      });
      if (error) {
        interface RpcError { message: string; details?: string; hint?: string | null; code?: string }
        const rpcErr = error as unknown as RpcError;
        console.error('start_test_attempt RPC error:', {
          message: rpcErr.message,
            details: rpcErr.details,
            hint: rpcErr.hint,
            code: rpcErr.code
        });
        throw error;
      }
      const payload: AttemptState = {
        attemptId: data.attempt_id as string,
        startedAt: data.started_at as string,
        status: data.status as string,
        questionOrder: Array.isArray(data.question_order) ? (data.question_order as string[]).map(q => String(q)) : undefined,
        optionOrders: data.option_orders ? (Object.fromEntries(Object.entries(data.option_orders as Record<string, unknown>).map(([k, v]) => {
          const arr = Array.isArray(v) ? v : [];
          return [k, arr.map(x => Number(x))];
        })) as Record<string, number[]>) : undefined
      };
      setAttempt(payload);
      return payload;
    } catch (e) {
      console.error('Error starting attempt (caught):', e);
      return null;
    }
  };

  const submitTestResultServer = async ({ testId, answers }: { testId: string; answers: number[] }) => {
    if (!user) return;
    try {
      const userRole = (user.unsafeMetadata?.role as string) || 'student';
      await ensureUserProfile(user, userRole as 'teacher' | 'student');
      const userUUID = await getCachedUUIDFromClerkId(user.id);
      const { data, error } = await supabase.rpc('submit_test_result', {
        p_test_id: testId,
        p_student_id: userUUID,
        p_answers: answers
      });
      if (error) throw error;
      if (data) {
        setAttempt(prev => ({ ...(prev || {}), status: data.status || 'submitted' }));
      }
      await refreshResults();
      await queryClient.invalidateQueries({ queryKey: ['question-stats', testId] });
    } catch (e) {
      console.error('Server scoring submission failed:', e);
      throw e;
    }
  };

  const fetchQuestionStats = useCallback(async (testId: string) => {
    try {
      return await queryClient.fetchQuery(getQuestionStatsQueryOptions(testId));
    } catch (e) {
      console.error('Failed to fetch question stats', e);
      return [];
    }
  }, [queryClient]);

  const getTestById = (id: string) => tests.find(test => test.id === id);
  const getResultsByTestId = (testId: string) => results.filter(result => result.testId === testId);
  const getResultsByStudentId = (studentId: string) => results.filter(result => result.studentId === studentId);

  const generateTestLink = (testId: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/test/${testId}`;
  };

  useEffect(() => {
    if (!user) return;
    const role = user.unsafeMetadata?.role as string | undefined;
    if (role !== 'teacher') return;

    let isCancelled = false;
    (async () => {
      try {
        const teacherUUID = await getCachedUUIDFromClerkId(user.id);
        const channel = supabase
          .channel('test_results_realtime')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'test_results' }, payload => {
            if (isCancelled) return;
            const newRow = payload.new as { test_id: string };
            const isOwnedTest = tests.some(t => t.id === newRow.test_id && t.createdBy === teacherUUID);
            if (isOwnedTest) {
              queryClient.invalidateQueries({ queryKey: ['results'] });
              queryClient.invalidateQueries({ queryKey: ['question-stats', newRow.test_id] });
            }
          })
          .subscribe(status => {
            if (status === 'SUBSCRIBED') {
              console.log('Realtime: subscribed to test_results inserts');
            }
          });

        return () => {
          isCancelled = true;
          supabase.removeChannel(channel);
        };
      } catch (e) {
        console.warn('Realtime subscription setup failed:', e);
      }
    })();
  }, [user, tests, queryClient]);

  return (
    <TestContext.Provider value={{
      tests,
      results,
      loading,
      createTest,
      updateTest,
      deleteTest,
      toggleTestStatus,
      submitTestResult,
      getTestById,
      getResultsByTestId,
      getResultsByStudentId,
      refreshTests,
      refreshResults,
      generateTestLink,
      startTestAttempt,
      submitTestResultServer,
      attempt,
      fetchQuestionStats
    }}>
      {children}
    </TestContext.Provider>
  );
}