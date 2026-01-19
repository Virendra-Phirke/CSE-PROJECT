import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useTestsQuery, useResultsQuery, getQuestionStatsQueryOptions, useAttemptQuery } from '../hooks/quizQueries';
import { useCreateTestMutation, useUpdateTestMutation, useDeleteTestMutation, useToggleTestStatusMutation, useStartAttemptMutation, useSubmitResultMutation } from '../hooks/quizMutations';
import { supabase } from '../lib/supabase';
import { useUser } from '@clerk/clerk-react';
import { getCachedUUIDFromClerkId, ensureUserProfile } from '../lib/clerkUtils';
import { canonicalizeRole } from '../lib/roleUtils';
import { useQueryClient } from '@tanstack/react-query';

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
  timePerQuestion?: number; // Optional: seconds allocated per question
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
  
  // Use mutations for better error handling and loading states
  const createTestMutation = useCreateTestMutation();
  const updateTestMutation = useUpdateTestMutation();
  const deleteTestMutation = useDeleteTestMutation();
  const toggleStatusMutation = useToggleTestStatusMutation();
  const startAttemptMutation = useStartAttemptMutation();
  const submitResultMutation = useSubmitResultMutation();
  
  const [currentTestId, setCurrentTestId] = useState<string | null>(null);
  const attemptQuery = useAttemptQuery(currentTestId || undefined);
  const attempt = attemptQuery.data || null;

  const tests = useMemo(() => testsQuery.data || [], [testsQuery.data]);
  const results = useMemo(() => resultsQuery.data || [], [resultsQuery.data]);
  const loading = testsQuery.isLoading || resultsQuery.isLoading || createTestMutation.isPending || updateTestMutation.isPending || deleteTestMutation.isPending;

  // Legacy refresh functions now just invalidate queries
  const refreshTests = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['tests'] });
  }, [queryClient]);
  const refreshResults = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['results'] });
  }, [queryClient]);

  const createTest = async (testData: Omit<LegacyTest, 'id'>) => {
    return createTestMutation.mutateAsync(testData);
  };

  const updateTest = async (testId: string, testData: Omit<LegacyTest, 'id'>) => {
    return updateTestMutation.mutateAsync({ id: testId, data: testData });
  };

  const deleteTest = async (testId: string) => {
    return deleteTestMutation.mutateAsync({ id: testId });
  };

  const toggleTestStatus = async (testId: string) => {
    const currentTest = tests.find(t => t.id === testId);
    if (!currentTest) throw new Error('Test not found');
    return toggleStatusMutation.mutateAsync({ id: testId, current: currentTest.isActive });
  };

  const submitTestResult = async (resultData: Omit<LegacyTestResult, 'id'>) => {
    if (!user) return;

    try {
  const userRole = canonicalizeRole(user.unsafeMetadata?.role as string | undefined) || 'student';
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
    setCurrentTestId(testId);
    const result = await startAttemptMutation.mutateAsync({ testId });
    return result.attempt;
  };

  const submitTestResultServer = async ({ testId, answers }: { testId: string; answers: number[] }) => {
    return submitResultMutation.mutateAsync({ testId, answers });
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
  const role = canonicalizeRole(user.unsafeMetadata?.role as string | undefined);
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