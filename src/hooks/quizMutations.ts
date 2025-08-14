import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useUser } from '@clerk/clerk-react';
import { ensureUserProfile, getCachedUUIDFromClerkId } from '../lib/clerkUtils';
import type { LegacyTest } from '../contexts/TestContext';
import type { AttemptState } from './quizQueries';

// Utility ensures role & returns UUID
async function prep(user: ReturnType<typeof useUser>['user']) {
  if (!user) throw new Error('Not authenticated');
  const role = (user.unsafeMetadata?.role as string) || 'student';
  await ensureUserProfile(user, role as 'teacher' | 'student');
  const userUUID = await getCachedUUIDFromClerkId(user.id);
  return { role, userUUID };
}

export function useCreateTestMutation() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (testData: Omit<LegacyTest, 'id'>) => {
      const { userUUID } = await prep(user);
      const { data: testInsert, error: testError } = await supabase
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
        const toInsert = testData.questions.map((q, i) => ({
          test_id: testInsert.id,
          question_text: q.question,
          options: q.options,
          correct_answer: q.correctAnswer,
          order_index: i
        }));
        const { error: qErr } = await supabase.from('questions').insert(toInsert);
        if (qErr) throw qErr;
      }
      return testInsert.id as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tests'] });
    }
  });
}

export function useUpdateTestMutation() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Omit<LegacyTest, 'id'> }) => {
      const { userUUID } = await prep(user);

      // Update test metadata first
      const { error: updErr } = await supabase
        .from('tests')
        .update({
          title: data.title,
          description: data.description,
          duration: data.duration,
          start_date: data.startDate,
          end_date: data.endDate,
          is_active: data.isActive
        })
        .eq('id', id)
        .eq('created_by', userUUID);
      if (updErr) throw updErr;

      // Fetch existing questions for diffing
      const { data: existing, error: existingErr } = await supabase
        .from('questions')
        .select('id, question_text, options, correct_answer, order_index')
        .eq('test_id', id)
        .order('order_index', { ascending: true });
      if (existingErr) throw existingErr;

      const existingMap = new Map<string, { question_text: string; options: string[]; correct_answer: number; order_index: number }>();
      (existing || []).forEach(q => existingMap.set(q.id as string, {
        question_text: q.question_text as string,
        options: q.options as string[],
        correct_answer: q.correct_answer as number,
        order_index: q.order_index as number
      }));

      const isUUID = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);

      const toInsert: Array<{ test_id: string; question_text: string; options: string[]; correct_answer: number; order_index: number }> = [];
      const toUpsert: Array<{ id: string; test_id: string; question_text: string; options: string[]; correct_answer: number; order_index: number }> = [];
      const referenced = new Set<string>();

      data.questions.forEach((q, idx) => {
        const desired = {
          question_text: q.question,
          options: q.options,
          correct_answer: q.correctAnswer,
          order_index: idx
        };
        const prev = existingMap.get(q.id);
        if (!prev || !isUUID(q.id)) {
          toInsert.push({ test_id: id, ...desired });
        } else {
          const changed = prev.question_text !== desired.question_text ||
            JSON.stringify(prev.options) !== JSON.stringify(desired.options) ||
            prev.correct_answer !== desired.correct_answer ||
            prev.order_index !== desired.order_index;
          if (changed) {
            toUpsert.push({ id: q.id, test_id: id, ...desired });
          }
          referenced.add(q.id);
        }
      });

      const toDelete = (existing || []).map(q => q.id as string).filter(oldId => !referenced.has(oldId));

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

      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['tests'] });
      queryClient.invalidateQueries({ queryKey: ['test', id] });
      queryClient.invalidateQueries({ queryKey: ['question-stats', id] });
    }
  });
}

export function useDeleteTestMutation() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { userUUID } = await prep(user);
      const { error } = await supabase.from('tests').delete().eq('id', id).eq('created_by', userUUID);
      if (error) throw error;
      return id;
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ['tests'] });
      const key = ['tests', user?.id];
      const previous = queryClient.getQueryData<LegacyTest[]>(key);
      if (previous) {
        queryClient.setQueryData<LegacyTest[]>(key, previous.filter(t => t.id !== id));
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      const key = ['tests', user?.id];
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tests'] });
    }
  });
}

export function useToggleTestStatusMutation() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, current }: { id: string; current: boolean }) => {
      const { userUUID } = await prep(user);
      const { error } = await supabase
        .from('tests')
        .update({ is_active: !current })
        .eq('id', id)
        .eq('created_by', userUUID);
      if (error) throw error;
      return { id, newStatus: !current };
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ['tests'] });
      const key = ['tests', user?.id];
      const previous = queryClient.getQueryData<LegacyTest[]>(key);
      if (previous) {
        queryClient.setQueryData<LegacyTest[]>(key, previous.map(t => t.id === id ? { ...t, isActive: !t.isActive } : t));
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      const key = ['tests', user?.id];
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tests'] });
    }
  });
}

export function useStartAttemptMutation() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ testId }: { testId: string }) => {
      if (!user) throw new Error('Not authenticated');
      const role = (user.unsafeMetadata?.role as string) || 'student';
      if (role !== 'student') throw new Error('Only students can start attempts');
      await ensureUserProfile(user, role as 'teacher' | 'student');
      const userUUID = await getCachedUUIDFromClerkId(user.id);
      const { data, error } = await supabase.rpc('start_test_attempt', { p_test_id: testId, p_student_id: userUUID });
      if (error) throw error;
      const attempt: AttemptState = {
        attemptId: data.attempt_id as string,
        startedAt: data.started_at as string,
        status: data.status as string,
        questionOrder: Array.isArray(data.question_order) ? (data.question_order as string[]).map(q => String(q)) : undefined,
        optionOrders: data.option_orders ? (Object.fromEntries(Object.entries(data.option_orders as Record<string, unknown>).map(([k, v]) => {
          const arr = Array.isArray(v) ? v : [];
          return [k, arr.map(x => Number(x))];
        })) as Record<string, number[]>) : undefined
      };
      return { testId, attempt };
    },
    onSuccess: ({ testId, attempt }) => {
      queryClient.setQueryData<AttemptState | undefined>(['attempt', testId, user?.id], attempt);
    }
  });
}

export function useSubmitResultMutation() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ testId, answers }: { testId: string; answers: number[] }) => {
      if (!user) throw new Error('Not authenticated');
      const role = (user.unsafeMetadata?.role as string) || 'student';
      await ensureUserProfile(user, role as 'teacher' | 'student');
      const userUUID = await getCachedUUIDFromClerkId(user.id);
      const { data, error } = await supabase.rpc('submit_test_result', { p_test_id: testId, p_student_id: userUUID, p_answers: answers });
      if (error) throw error;
      return { testId, status: data?.status || 'submitted' };
    },
    onSuccess: ({ testId, status }) => {
      const key = ['attempt', testId, user?.id];
      const prev = queryClient.getQueryData<AttemptState | undefined>(key);
      queryClient.setQueryData<AttemptState | undefined>(key, { ...(prev || {}), status });
      queryClient.invalidateQueries({ queryKey: ['results'] });
      queryClient.invalidateQueries({ queryKey: ['question-stats', testId] });
    }
  });
}
