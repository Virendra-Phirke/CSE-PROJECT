import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { useTestQuery, useAttemptQuery } from '../hooks/quizQueries';
import { canonicalizeRole } from '../lib/roleUtils';
import { useStartAttemptMutation, useSubmitResultMutation } from '../hooks/quizMutations';
import { useTest } from '../hooks/useTest';
import { LegacyTest } from '../contexts/TestContext';
import { CheckCircle, AlertCircle, BookOpen, Users } from 'lucide-react';
import { ModernAuthCard } from '../components/ModernAuthCard';
import { Skeleton } from '../components/Skeleton';
import { useLoading } from '../hooks/useLoading';
import { useToast } from '../components/ui/Toast';

// Auto-submit safeguard configuration
const AUTO_SUBMIT_CONFIG = {
  // Periodic backup submit interval (every 30 seconds)
  BACKUP_INTERVAL: 30000,
  // Time before test expiry to force submit (30 seconds buffer)
  FORCE_SUBMIT_BUFFER: 30,
  // Minimum time between auto-submits to prevent spam
  MIN_SUBMIT_INTERVAL: 5000,
} as const;

function TakeTest() {
  const { testId } = useParams<{ testId: string }>();
  const { user, isLoaded } = useUser();
  const { loading } = useTest();
  const startAttemptMutation = useStartAttemptMutation();
  const submitResultMutation = useSubmitResultMutation();
  const navigate = useNavigate();
  const { start: startLoading, stop: stopLoading, isLoading } = useLoading();
  const { addToast, ToastContainer } = useToast();

  // Removed local test state in favor of React Query
  // const [test, setTest] = useState<LegacyTest | null>(null);
  // const [testLoading, setTestLoading] = useState(true);
  const [testError, setTestError] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [testStarted, setTestStarted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // authMode was previously used to toggle SignIn/SignUp UI; we now use Clerk's default SignIn only
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  const progressBarRef = useRef<HTMLDivElement>(null);
  
  // Per-question timer system
  const [questionTimeLeft, setQuestionTimeLeft] = useState(0);
  const [timedOutQuestions, setTimedOutQuestions] = useState<Set<number>>(new Set());
  const [timePerQuestion, setTimePerQuestion] = useState(30); // Default 30 seconds
  const questionTimerInitialized = useRef(false); // Track if timer has been initialized
  const questionTimerRef = useRef<NodeJS.Timeout | null>(null); // Track the interval
  const currentQuestionRef = useRef(0); // Track current question for stable reference
  const totalTestTimerRef = useRef<NodeJS.Timeout | null>(null); // Track main test timer
  const totalTestTimerStarted = useRef(false); // Track if main timer has started
  const timerRunningRef = useRef(false); // Track if question timer is currently running
  
  // Track time remaining for each question individually
  const questionTimesRef = useRef<Record<number, number>>({}); // Store remaining time per question
  const lastQuestionRef = useRef<number>(-1); // Track last viewed question
  
  // Use React Query for attempt state
  const attemptQuery = useAttemptQuery(testId);
  const attempt = attemptQuery.data || null;
  
  // Auto-submit safeguard state
  const lastAutoSubmitRef = useRef<number>(0);
  const backupIntervalRef = useRef<NodeJS.Timeout>();
  const forceSubmitTimeoutRef = useRef<NodeJS.Timeout>();

  // Check if user needs authentication or role setup
  const needsAuth = !isLoaded || !user;
  const needsRole = !!user && !canonicalizeRole(user.unsafeMetadata?.role as string | undefined);

  // Handle role setup for authenticated users without a role
  const handleRoleSetup = async (selectedRole: 'teacher' | 'student') => {
    if (!user) return;
    
    try {
      await user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          role: selectedRole
        }
      });
      // Role is now set, component will re-render and show the test
    } catch (error) {
      console.error('Error setting role:', error);
    }
  };

  const testQuery = useTestQuery(testId);
  const test = testQuery.data || null;

  // Sync global loading context with query status
  useEffect(() => {
    if (testQuery.isFetching) startLoading('test:load'); else stopLoading('test:load');
  }, [testQuery.isFetching, startLoading, stopLoading]);

  // Validate test when loaded
  useEffect(() => {
    if (!testId) return;
    if (testQuery.isLoading) return; // still loading
    if (testQuery.error) {
      setTestError('Failed to load test');
      return;
    }
    const testData = test;
    if (!testData) {
      setTestError('Test not found');
      return;
    }
    if (!testData.isActive) {
      setTestError('This test is no longer active');
      return;
    }
    const now = new Date();
    const startDate = new Date(testData.startDate);
    const endDate = new Date(testData.endDate);
    if (now < startDate) {
      setTestError('This test has not started yet');
      return;
    }
    if (now > endDate) {
      setTestError('This test has ended');
      return;
    }
    setTestError(null);
  }, [testQuery.isLoading, testQuery.error, test, testId]);

  // Attempt resurrection / auto-detect existing attempt
  useEffect(() => {
    if (!attempt || !test || testStarted) return;
    
    if (attempt.status === 'submitted') {
      navigate(`/results/${testId}`);
      return;
    }
    
    if (attempt.status === 'in_progress') {
      setTestStarted(true);
    }
  }, [attempt, test, testStarted, testId, navigate]);

  useEffect(() => {
    if (test && testStarted) {
      // Compute remaining time based on attempt.startedAt if available
      let remaining = test.duration * 60;
      if (attempt?.startedAt) {
        const startedTs = new Date(attempt.startedAt).getTime();
        const nowTs = Date.now();
        const elapsed = Math.max(0, Math.floor((nowTs - startedTs) / 1000));
        remaining = Math.max(0, remaining - elapsed);
      }
      setTimeLeft(remaining);
      
      // Calculate time per question - use stored value if available, otherwise calculate
      // Using stored value ensures accuracy even when duration was rounded up
      const calculatedTimePerQuestion = test.timePerQuestion 
        ? test.timePerQuestion 
        : Math.floor((test.duration * 60) / test.questions.length);
      setTimePerQuestion(calculatedTimePerQuestion);
      
      // Initialize all question timers with full time (only once)
      if (!questionTimerInitialized.current) {
        const initialTimes: Record<number, number> = {};
        for (let i = 0; i < test.questions.length; i++) {
          initialTimes[i] = calculatedTimePerQuestion;
        }
        questionTimesRef.current = initialTimes;
        setQuestionTimeLeft(calculatedTimePerQuestion);
        questionTimerInitialized.current = true; // Mark as initialized
      }
      
      // answers length should match displayQuestions length (deferred until we know mapping)
    }
  }, [test, testStarted, attempt]);

  // Derive display question order & per-question option ordering
  const displayQuestions = useMemo(() => {
    if (!test) return [] as Array<LegacyTest['questions'][number]>;
    if (!attempt?.questionOrder || attempt.questionOrder.length === 0) return test.questions; // fallback original order
    const map = new Map(test.questions.map(q => [q.id, q]));
    const ordered = attempt.questionOrder.map((qid: string) => map.get(qid)).filter(Boolean) as Array<LegacyTest['questions'][number]>;
    return ordered.length === test.questions.length ? ordered : test.questions;
  }, [test, attempt]);

  const getDisplayOptions = useCallback((q: LegacyTest['questions'][number]) => {
    if (!attempt?.optionOrders || !attempt.optionOrders[q.id]) return q.options; // identity
    const perm = attempt.optionOrders[q.id]; // array mapping display index -> original option index
    if (!Array.isArray(perm) || perm.length !== q.options.length) return q.options;
    return perm.map(originalIdx => q.options[originalIdx]);
  }, [attempt]);

  // Initialize / resize answers when displayQuestions known
  useEffect(() => {
    if (testStarted && displayQuestions.length > 0) {
      setAnswers(prev => {
        if (prev.length === displayQuestions.length) return prev;
        return new Array(displayQuestions.length).fill(-1);
      });
    }
  }, [testStarted, displayQuestions]);

  const handleAnswerSelect = useCallback((answerIndex: number) => {
    setAnswers(a => {
      const copy = [...a];
      copy[currentQuestion] = answerIndex;
      return copy;
    });
  }, [currentQuestion]);

  const handleNext = useCallback(() => {
    if (displayQuestions.length && currentQuestion < displayQuestions.length - 1) {
      setCurrentQuestion(q => q + 1);
      // Timer will be reset automatically by the effect watching currentQuestion
    }
  }, [displayQuestions.length, currentQuestion]);

  const handlePrevious = useCallback(() => {
    // Prevent navigating back to timed-out questions
    if (currentQuestion > 0 && !timedOutQuestions.has(currentQuestion - 1)) {
      setCurrentQuestion(q => q - 1);
      // Timer will be reset automatically by the effect watching currentQuestion
    }
  }, [currentQuestion, timedOutQuestions]);

  // Repositioned keyboard navigation effect after handlers defined
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!testStarted) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevious();
      } else if (/^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key,10) - 1;
        // Prevent navigating to timed-out questions
        if (idx >= 0 && idx < displayQuestions.length && !timedOutQuestions.has(idx)) {
          setCurrentQuestion(idx);
          // Timer will be reset automatically by the effect watching currentQuestion
        }
      } else if (/^[a-dA-D]$/.test(e.key)) {
        const optionIdx = e.key.toLowerCase().charCodeAt(0) - 97; // a=0
        const optLength = getDisplayOptions(displayQuestions[currentQuestion]).length;
        if (optionIdx >=0 && optionIdx < optLength) {
          handleAnswerSelect(optionIdx);
        }
      } else if (e.key === 'f' || e.key === 'F') {
        setFlagged(f => ({ ...f, [currentQuestion]: !f[currentQuestion] }));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [testStarted, displayQuestions, currentQuestion, getDisplayOptions, handleNext, handlePrevious, handleAnswerSelect, timedOutQuestions]);

  const toggleFlag = () => setFlagged(f => ({ ...f, [currentQuestion]: !f[currentQuestion] }));

  // When submitting, we must send answers in the display order (server maps back using ordering metadata)
  const handleSubmit = useCallback(async () => {
    if (!test || !user) return;
    if (attempt?.status === 'submitted') {
      navigate(`/results/${testId}`);
      return;
    }
    setSubmitting(true);
    try {
      await submitResultMutation.mutateAsync({ testId: test.id, answers });
      // Fire confetti on successful submission
      const { fireConfetti } = await import('../lib/confetti');
      fireConfetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      
      addToast({
        type: 'success',
        title: 'Test Submitted!',
        message: 'Your answers have been submitted successfully.'
      });
      
      navigate(`/results/${testId}`);
    } catch (error: unknown) {
      console.error('Error submitting test (server RPC):', error);
      const msg = isErrorWithMessage(error) ? error.message.toUpperCase() : '';
      if (msg.includes('ALREADY_SUBMITTED') || msg.includes('RESULT_ALREADY_EXISTS')) {
        navigate(`/results/${testId}`);
      } else {
        addToast({
          type: 'error',
          title: 'Submission Failed',
          message: 'Error submitting test. Please try again.'
        });
      }
    } finally {
      setSubmitting(false);
    }
  }, [test, user, answers, testId, submitResultMutation, navigate, attempt, addToast]);

  // Timer effect - must be after handleSubmit declaration
  useEffect(() => {
    // Only run this effect once when test starts
    if (!testStarted || totalTestTimerStarted.current) return;
    
    totalTestTimerStarted.current = true;
    
    totalTestTimerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (totalTestTimerRef.current) {
        clearInterval(totalTestTimerRef.current);
        totalTestTimerRef.current = null;
      }
    };
  }, [testStarted, handleSubmit]);

  // Keep currentQuestionRef in sync
  useEffect(() => {
    currentQuestionRef.current = currentQuestion;
  }, [currentQuestion]);

  // Handle question change - save current question's time and restore new question's time
  useEffect(() => {
    if (!testStarted || displayQuestions.length === 0) return;
    
    // Save the current question's remaining time before switching
    if (lastQuestionRef.current >= 0 && lastQuestionRef.current !== currentQuestion) {
      questionTimesRef.current[lastQuestionRef.current] = questionTimeLeft;
    }
    
    // Load the new question's remaining time
    const savedTime = questionTimesRef.current[currentQuestion];
    if (savedTime !== undefined) {
      setQuestionTimeLeft(savedTime);
    }
    
    // Update last question tracker
    lastQuestionRef.current = currentQuestion;
  }, [currentQuestion, testStarted, displayQuestions.length, questionTimeLeft]);

  // Per-question timer effect - single stable interval that runs continuously
  useEffect(() => {
    if (!testStarted || !questionTimerInitialized.current) return;
    
    // Only create one timer for the entire test
    if (timerRunningRef.current) return;
    
    timerRunningRef.current = true;
    
    // Create a stable interval that runs every second
    questionTimerRef.current = setInterval(() => {
      const currentQ = currentQuestionRef.current;
      const currentTime = questionTimesRef.current[currentQ];
      
      if (currentTime !== undefined && currentTime > 0) {
        const newValue = currentTime - 1;
        questionTimesRef.current[currentQ] = newValue;
        setQuestionTimeLeft(newValue);
        
        if (newValue <= 0) {
          // Time's up for this question
          setTimedOutQuestions(prevSet => {
            const newSet = new Set(prevSet);
            newSet.add(currentQ);
            return newSet;
          });
          
          // Auto-advance to next question if available
          if (currentQ < displayQuestions.length - 1) {
            setCurrentQuestion(currentQ + 1);
          }
        }
      }
    }, 1000);

    return () => {
      if (questionTimerRef.current) {
        clearInterval(questionTimerRef.current);
        questionTimerRef.current = null;
      }
      timerRunningRef.current = false;
    };
  }, [testStarted, displayQuestions.length]);

  // Auto-submit safeguard: periodic backup submission
  useEffect(() => {
    if (!testStarted || !test || attempt?.status === 'submitted') return;

    const performBackupSubmit = async () => {
      const now = Date.now();
      // Prevent spam submits
      if (now - lastAutoSubmitRef.current < AUTO_SUBMIT_CONFIG.MIN_SUBMIT_INTERVAL) return;
      
      try {
        lastAutoSubmitRef.current = now;
        await submitResultMutation.mutateAsync({ testId: test.id, answers });
        console.log('Auto-backup submit successful');
        // If successful, navigate to results
        navigate(`/results/${testId}`);
      } catch (error) {
        console.warn('Auto-backup submit failed (expected):', error);
        // Backup submits are expected to sometimes fail, just log and continue
      }
    };

    // Set up periodic backup
    backupIntervalRef.current = setInterval(performBackupSubmit, AUTO_SUBMIT_CONFIG.BACKUP_INTERVAL);

    return () => {
      if (backupIntervalRef.current) {
        clearInterval(backupIntervalRef.current);
      }
    };
  }, [testStarted, test, attempt?.status, answers, testId, submitResultMutation, navigate]);

  // Auto-submit safeguard: force submit when approaching deadline
  // This effect should only run once to set up the timeout
  useEffect(() => {
    if (!testStarted || !test || attempt?.status === 'submitted' || timeLeft <= 0) return;
    
    // Only set up timeout if we have enough time
    if (timeLeft > AUTO_SUBMIT_CONFIG.FORCE_SUBMIT_BUFFER) {
      const delayUntilForceSubmit = (timeLeft - AUTO_SUBMIT_CONFIG.FORCE_SUBMIT_BUFFER) * 1000;
      
      forceSubmitTimeoutRef.current = setTimeout(async () => {
        try {
          // Get latest answers at the time of submission
          await submitResultMutation.mutateAsync({ testId: test.id, answers });
          navigate(`/results/${testId}`);
        } catch (error) {
          console.error('Force submit failed:', error);
          navigate(`/results/${testId}`);
        }
      }, delayUntilForceSubmit);
    }

    return () => {
      if (forceSubmitTimeoutRef.current) {
        clearTimeout(forceSubmitTimeoutRef.current);
      }
    };
    // Run only once when test starts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testStarted]);

  // Auto-submit safeguard: handle page visibility changes and beforeunload
  useEffect(() => {
    if (!testStarted || !test || attempt?.status === 'submitted') return;

    const handleVisibilityChange = async () => {
      if (document.hidden) {
        // Page is being hidden, try to submit
        const now = Date.now();
        if (now - lastAutoSubmitRef.current >= AUTO_SUBMIT_CONFIG.MIN_SUBMIT_INTERVAL) {
          try {
            lastAutoSubmitRef.current = now;
            await submitResultMutation.mutateAsync({ testId: test.id, answers });
          } catch (error) {
            console.warn('Visibility change submit failed:', error);
          }
        }
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Try to submit synchronously (best effort)
      try {
        submitResultMutation.mutateAsync({ testId: test.id, answers });
      } catch (error) {
        console.warn('Before unload submit failed:', error);
      }
      
      // Show warning to user
      e.preventDefault();
      e.returnValue = 'Your test progress may be lost if you leave this page.';
      return e.returnValue;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [testStarted, test, attempt?.status, answers, testId, submitResultMutation]);

  // Utility functions
  const startTest = async () => {
    if (!testId) return;
    try {
      const result = await startAttemptMutation.mutateAsync({ testId });
      if (result.attempt) {
      setTestStarted(true);
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to Start Test',
        message: 'Could not start test attempt. Please try again.'
      });
    }
  };

  const isErrorWithMessage = (e: unknown): e is { message: string } => {
    return typeof e === 'object' && e !== null && 'message' in (e as Record<string, unknown>) && typeof (e as Record<string, unknown>).message === 'string';
  };

  const answeredCount = useMemo(() => answers.filter(a => a !== -1).length, [answers]);

  useEffect(() => {
    if (progressBarRef.current && displayQuestions.length > 0) {
      const pct = (answeredCount / displayQuestions.length) * 100;
      progressBarRef.current.style.width = pct + '%';
    }
  }, [answeredCount, displayQuestions.length]);

  if (testQuery.isLoading || loading || !isLoaded || isLoading('test:load')) {
    // Skeleton loading state
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg-primary py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="space-y-2">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
          <Skeleton className="h-2 w-full" />
          <div className="bg-white dark:bg-dark-bg-secondary rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-8 space-y-6">
            <Skeleton className="h-6 w-3/4" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-dark-border">
              <div className="flex space-x-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-8 rounded-full" />
                ))}
              </div>
              <Skeleton className="h-10 w-32 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show authentication form if user is not logged in
  if (needsAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
        <ModernAuthCard mode="signin" />
      </div>
    );
  }

  // Show role selection if user is logged in but doesn't have a role
  if (needsRole) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-gradient-to-r from-accent-purple-500 to-accent-red-500 p-3 rounded-full">
                <BookOpen className="h-8 w-8 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold gradient-text">Choose Your Role</h2>
            <p className="mt-2 text-gray-600 dark:text-dark-text-secondary">
              Welcome {user?.firstName}! Please select your role to continue.
            </p>
          </div>

          {/* Role Selection */}
          <div className="card-elevated card-gradient p-8">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-8 text-center">
              I am a...
            </h3>
            
            <div className="grid grid-cols-1 gap-6 mb-8">
              <button
                onClick={() => handleRoleSetup('student')}
                className="role-button-student selected"
                aria-pressed="true"
                aria-describedby="student-description-taketest"
              >
                <div className="flex items-center">
                  <Users className="h-10 w-10 mr-6 icon-primary" />
                  <div className="text-left flex-1">
                    <p className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-1">Student</p>
                    <p id="student-description-taketest" className="text-sm text-gray-600 dark:text-dark-text-secondary">
                      Take this test and view your results
                    </p>
                  </div>
                  <div className="ml-4">
                    <div className="w-6 h-6 bg-accent-purple-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => handleRoleSetup('teacher')}
                className="role-button-teacher"
                aria-pressed="false"
                aria-describedby="teacher-description-taketest"
              >
                <div className="flex items-center">
                  <BookOpen className="h-10 w-10 mr-6 text-gray-500 dark:text-gray-400 transition-colors duration-200" />
                  <div className="text-left flex-1">
                    <p className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-1">Teacher</p>
                    <p id="teacher-description-taketest" className="text-sm text-gray-600 dark:text-dark-text-secondary">
                      Access teacher dashboard and manage tests
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (testError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg-primary flex items-center justify-center">
        <div className="text-center bg-white dark:bg-dark-bg-secondary border border-gray-200 dark:border-dark-border rounded-xl p-8 shadow-sm">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary mb-2">Unable to Load Test</h1>
            <p className="text-gray-600 dark:text-dark-text-secondary mb-4">{testError}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-dark-bg-primary"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg-primary flex items-center justify-center">
        <div className="text-center bg-white dark:bg-dark-bg-secondary border border-gray-200 dark:border-dark-border rounded-xl p-8 shadow-sm">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary mb-2">Test Not Found</h1>
          <p className="text-gray-600 dark:text-dark-text-secondary">The test you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  if (!testStarted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg-primary flex items-center justify-center">
        <div className="max-w-md w-full bg-white dark:bg-dark-bg-secondary rounded-xl shadow-lg p-8 border border-gray-200 dark:border-dark-border" role="dialog" aria-labelledby="test-intro-title" aria-describedby="test-intro-desc">
          <div className="text-center mb-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" aria-hidden="true" />
            <h1 id="test-intro-title" className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary mb-2">{test.title}</h1>
            <p id="test-intro-desc" className="text-gray-600 dark:text-dark-text-secondary">{test.description}</p>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-dark-text-secondary">Duration:</span>
              <span className="font-semibold text-gray-900 dark:text-dark-text-primary">{test.duration} minutes</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-dark-text-secondary">Questions:</span>
              <span className="font-semibold text-gray-900 dark:text-dark-text-primary">{test.questions.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-dark-text-secondary">Type:</span>
              <span className="font-semibold text-gray-900 dark:text-dark-text-primary">Multiple Choice</span>
            </div>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2">Instructions:</h3>
            <ul className="text-sm text-yellow-700 dark:text-yellow-400 space-y-1">
              <li>• Read each question carefully</li>
              <li>• Select the best answer for each question</li>
              <li>• You can navigate between questions</li>
              <li>• Submit before time runs out</li>
            </ul>
          </div>

          <button
            onClick={startTest}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-dark-bg-primary"
            aria-label="Start test"
          >
            Start Test
          </button>
        </div>
      </div>
    );
  }

  const currentQ = displayQuestions[currentQuestion];

  return (
    <div className="min-h-screen bg-mesh-premium">
      <ToastContainer />
      {/* Header */}
      <div className="backdrop-blur-xl bg-white/70 dark:bg-black/40 shadow-sm border-b border-white/20 sticky top-0 z-20 supports-[backdrop-filter]:bg-white/55 dark:supports-[backdrop-filter]:bg-black/30" role="banner">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white flex items-center gap-3" id="test-title">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-glow text-sm font-bold">{test.title.charAt(0).toUpperCase()}</span>
                <span className="gradient-text drop-shadow-sm">{test.title}</span>
              </h1>
              <p className="mt-1 text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider" aria-live="polite">
                Question {currentQuestion + 1} / {displayQuestions.length}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-24 h-24">
                  <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      className="text-gray-200 dark:text-gray-700"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      r="45"
                      cx="50"
                      cy="50"
                    />
                    <circle
                      className={`${questionTimeLeft <= 10 ? 'text-rose-500' : questionTimeLeft <= 20 ? 'text-yellow-500' : 'text-purple-500'} timer-progress`}
                      stroke="currentColor"
                      strokeWidth="8"
                      strokeLinecap="round"
                      fill="transparent"
                      r="45"
                      cx="50"
                      cy="50"
                      data-progress={questionTimeLeft / timePerQuestion}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className={`text-lg font-bold ${questionTimeLeft <= 10 ? 'text-rose-600' : 'text-gray-800 dark:text-gray-100'}`}>
                        {questionTimeLeft}s
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400">
                        per Q
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={toggleFlag}
                className={`px-4 h-11 inline-flex items-center rounded-xl text-xs font-semibold border backdrop-blur-md transition-all shadow-inner-glow hover:shadow-glow focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black ${flagged[currentQuestion] ? 'bg-yellow-400/20 text-yellow-800 dark:text-yellow-200 border-yellow-300/50 dark:border-yellow-500/40' : 'bg-white/40 dark:bg-white/10 text-gray-700 dark:text-gray-300 border-white/30 hover:bg-white/60 dark:hover:bg-white/15'} `}
              >
                {flagged[currentQuestion] ? 'Unflag' : 'Flag'}
              </button>
            </div>
          </div>
          {/* Progress Bar */}
          <div className="w-full h-2 mb-2 rounded-full bg-white/30 dark:bg-white/10 overflow-hidden" role="progressbar" aria-label="Answered questions progress">
            <div
              ref={progressBarRef}
              className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 transition-all duration-500"
            ></div>
          </div>
          <div className="flex justify-between text-[11px] font-medium text-gray-600 dark:text-gray-400 pb-3">
            <span>Answered: {answeredCount}/{displayQuestions.length}</span>
            <span>Flagged: {Object.values(flagged).filter(Boolean).length}</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8" role="main" aria-labelledby="test-title">
        <div className="grid xl:grid-cols-4 gap-8">
          {/* Question Palette */}
          <aside className="xl:col-span-1 order-2 xl:order-1">
            <div className="sticky top-28 space-y-6">
              <div className="rounded-3xl border border-white/15 bg-white/50 dark:bg-white/5 backdrop-blur-xl p-5 shadow-inner-glow">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 animate-pulse-soft" />
                  Navigation
                </h2>
                <div className="flex flex-wrap gap-2">
                  {displayQuestions.map((_, index) => {
                    const answered = answers[index] !== -1;
                    const isFlagged = flagged[index];
                    const isTimedOut = timedOutQuestions.has(index);
                    return (
                      <button
                        key={index}
                        onClick={() => {
                          if (!isTimedOut) {
                            setCurrentQuestion(index);
                            setQuestionTimeLeft(timePerQuestion); // Reset timer when manually navigating
                          }
                        }}
                        disabled={isTimedOut}
                        className={`relative w-10 h-10 rounded-xl text-xs font-semibold backdrop-blur-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black ${
                          isTimedOut
                            ? 'bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/40 cursor-not-allowed opacity-50'
                            : index === currentQuestion
                            ? 'bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-glow'
                            : answered
                              ? 'bg-emerald-400/15 text-emerald-600 dark:text-emerald-300 border border-emerald-400/30'
                              : 'bg-white/40 dark:bg-white/10 text-gray-600 dark:text-gray-400 border border-white/25 hover:bg-white/60 dark:hover:bg-white/15'
                        }`}
                        aria-label={`Question ${index + 1}${isFlagged ? ' flagged' : ''}${answered ? ' answered' : ' not answered'}${isTimedOut ? ' timed out' : ''}`}
                        aria-current={index === currentQuestion ? 'true' : 'false'}
                      >
                        {index + 1}
                        {isFlagged && <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full shadow" aria-hidden="true" />}
                        {isTimedOut && <span className="absolute -bottom-1 -right-1 text-[8px]">🔒</span>}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-5 flex flex-wrap gap-3 text-[10px] text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-md bg-emerald-400/30 border border-emerald-400/40" />Answered</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-md bg-white/40 dark:bg-white/10 border border-white/25" />Unanswered</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-400" />Flagged</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-md bg-red-500/30 border border-red-500/40" />Locked</span>
                </div>
              </div>

              <div className="rounded-3xl border border-white/15 bg-white/60 dark:bg-white/5 backdrop-blur-xl p-5 shadow-inner-glow">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Status</h3>
                <div className="grid grid-cols-6 gap-2">
                  {displayQuestions.map((_, index) => {
                    const isTimedOut = timedOutQuestions.has(index);
                    return (
                      <div
                        key={index}
                        className={`relative flex items-center justify-center w-9 h-9 rounded-xl text-[11px] font-semibold ${
                          isTimedOut
                            ? 'bg-red-500/20 text-red-600 dark:text-red-300'
                            : answers[index] !== -1
                              ? 'bg-emerald-400/20 text-emerald-600 dark:text-emerald-300'
                              : 'bg-white/40 dark:bg-white/10 text-gray-600 dark:text-gray-400'
                        }`}
                        aria-label={`Question ${index + 1} ${isTimedOut ? 'timed out' : answers[index] !== -1 ? 'answered' : 'not answered'}${flagged[index] ? ' flagged' : ''}`}
                      >
                        {index + 1}
                        {flagged[index] && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-yellow-400 rounded-full" aria-hidden="true" />}
                        {isTimedOut && <span className="absolute -bottom-1 -right-1 text-[8px]">🔒</span>}
                      </div>
                    );
                  })}
                </div>
                <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-4 font-medium">
                  Answered: {answers.filter(answer => answer !== -1).length} / {displayQuestions.length}
                </p>
                {timedOutQuestions.size > 0 && (
                  <p className="text-[11px] text-red-600 dark:text-red-400 mt-2 font-medium">
                    Locked: {timedOutQuestions.size}
                  </p>
                )}
              </div>
            </div>
          </aside>

          {/* Question & Answers */}
          <div className="xl:col-span-3 order-1 xl:order-2">
            {questionTimeLeft <= 10 && questionTimeLeft > 0 && (
              <div className="mb-4 rounded-2xl border border-red-300/50 bg-red-50/50 dark:bg-red-900/20 dark:border-red-700/40 backdrop-blur-xl p-4 animate-pulse">
                <p className="text-sm font-semibold text-red-800 dark:text-red-300 text-center">
                  ⏰ Only {questionTimeLeft} seconds left for this question!
                </p>
              </div>
            )}
            <div className="rounded-3xl border border-white/15 bg-white/70 dark:bg-white/5 backdrop-blur-2xl shadow-inner-glow px-6 md:px-10 py-10 transition-all">
              {/* Question */}
              <div className="mb-10">
                <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-900 dark:text-white mb-8 leading-snug" id={`question-${currentQ.id}`}>
                  <span className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent">
                    {currentQ.question}
                  </span>
                </h2>
                {/* Options */}
                <div className="space-y-4" role="radiogroup" aria-labelledby={`question-${currentQ.id}`}> 
                  {getDisplayOptions(currentQ).map((option, index) => {
                    const selected = answers[currentQuestion] === index;
                    return (
                      <button
                        key={index}
                        onClick={() => handleAnswerSelect(index)}
                        className={`group relative w-full text-left rounded-2xl border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black overflow-hidden ${
                          selected
                            ? 'border-transparent bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-500 text-white shadow-glow'
                            : 'border-white/30 dark:border-white/15 bg-white/60 dark:bg-white/5 hover:border-pink-400/60 hover:bg-white/80 dark:hover:bg-white/10'
                        }`}
                        data-selected={selected ? 'true' : 'false'}
                        aria-label={`Option ${String.fromCharCode(65 + index)} ${selected ? 'selected' : 'not selected'}`}
                        tabIndex={0}
                      >
                        <div className="flex items-center p-5 md:p-6 gap-4">
                          <span className={`flex items-center justify-center w-9 h-9 rounded-xl border-2 text-xs font-bold tracking-wide ${selected ? 'border-white bg-white/20' : 'border-pink-500/30 text-pink-500'} transition-colors`}>
                            {String.fromCharCode(65 + index)}
                          </span>
                          <span className={`text-sm md:text-base font-medium ${selected ? 'text-white' : 'text-gray-800 dark:text-gray-200'} leading-relaxed`}>{option}</span>
                        </div>
                        {!selected && <span className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-pink-400/0 via-pink-400/10 to-pink-400/0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Navigation */}
              <div className="flex flex-col md:flex-row gap-4 justify-between items-center pt-4 border-t border-white/20">
                <div className="flex gap-3 w-full md:w-auto">
                  <button
                    onClick={handlePrevious}
                    disabled={currentQuestion === 0 || (currentQuestion > 0 && timedOutQuestions.has(currentQuestion - 1))}
                    className="px-6 h-11 rounded-xl border border-white/25 bg-white/50 dark:bg-white/5 backdrop-blur-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-white/70 dark:hover:bg-white/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={currentQuestion === displayQuestions.length - 1}
                    className="px-6 h-11 rounded-xl border border-white/25 bg-white/50 dark:bg-white/5 backdrop-blur-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-white/70 dark:hover:bg-white/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                {currentQuestion === displayQuestions.length - 1 && (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || answers.some(answer => answer === -1) || attempt?.status === 'submitted'}
                    className="px-10 h-12 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-500 text-white font-semibold shadow-glow hover:brightness-110 active:scale-[.97] transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {attempt?.status === 'submitted' ? 'Already Submitted' : (submitting ? 'Submitting…' : 'Submit Test')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TakeTest;