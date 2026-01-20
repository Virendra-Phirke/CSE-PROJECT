import { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { useTestQuery, useResultsQuery } from '../hooks/quizQueries';
import { LegacyTest, LegacyTestResult } from '../contexts/TestContext';
import { ArrowLeft, CheckCircle, XCircle, Clock, Trophy } from 'lucide-react';
import { getCachedUUIDFromClerkId } from '../lib/clerkUtils';
import { canonicalizeRole } from '../lib/roleUtils';
import { Skeleton, CardSkeleton } from '../components/Skeleton';

function TestResults() {
  const { testId } = useParams<{ testId: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useUser();
  const testQuery = useTestQuery(testId);
  const resultsQuery = useResultsQuery(testQuery.data ? [testQuery.data] : undefined);
  const loading = testQuery.isLoading || resultsQuery.isLoading;
  const [userUUID, setUserUUID] = useState<string>('');
  
  // Check if viewing as teacher for a specific student
  const studentIdParam = searchParams.get('student');
  const userRole = canonicalizeRole(user?.unsafeMetadata?.role as string | undefined);
  const isTeacherView = userRole === 'teacher' && studentIdParam;

  // Generate UUID for current user to find their result
  useEffect(() => {
    const generateUserUUID = async () => {
      if (user?.id) {
        const uuid = await getCachedUUIDFromClerkId(user.id);
        setUserUUID(uuid);
      }
    };
    generateUserUUID();
  }, [user?.id]);

  const test: LegacyTest | undefined = testQuery.data;
  const testResults: LegacyTestResult[] = resultsQuery.data?.filter(r => r.testId === testId) || [];
  
  // Find the result to display - either the specified student or current user
  const targetStudentId = isTeacherView ? studentIdParam : userUUID;
  const myResult: LegacyTestResult | undefined = testResults.find((r: LegacyTestResult) => r.studentId === targetStudentId);

  if (loading) {
    return (
      <div className="min-h-screen bg-mesh-premium py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header skeleton */}
          <div className="flex items-center space-x-4">
            <Skeleton className="h-6 w-32" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>

          {/* Score summary skeleton */}
          <div className="rounded-3xl border border-white/15 bg-white/70 dark:bg-white/5 backdrop-blur-2xl p-8 shadow-inner-glow space-y-6">
            <div className="text-center space-y-4">
              <Skeleton className="h-20 w-20 mx-auto rounded-full" />
              <Skeleton className="h-10 w-80 mx-auto" />
              <Skeleton className="h-6 w-56 mx-auto" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <CardSkeleton lines={2} />
              <CardSkeleton lines={2} />
              <CardSkeleton lines={2} />
            </div>
          </div>

          {/* Question review skeleton */}
          <div className="rounded-3xl border border-white/15 bg-white/70 dark:bg-white/5 backdrop-blur-2xl shadow-inner-glow p-6 space-y-6">
            <Skeleton className="h-8 w-64" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-white/20 bg-white/40 dark:bg-white/5 backdrop-blur-md p-6 space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <Skeleton key={j} className="h-12 w-full rounded-xl" />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Performance summary skeleton */}
          <div className="rounded-3xl border border-white/15 bg-white/70 dark:bg-white/5 backdrop-blur-2xl shadow-inner-glow p-6">
            <Skeleton className="h-8 w-64 mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))}
              </div>
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!test || !myResult) {
    return (
      <div className="min-h-screen bg-mesh-premium flex items-center justify-center p-4">
        <div className="text-center rounded-3xl border border-white/15 bg-white/70 dark:bg-white/5 backdrop-blur-2xl shadow-glow p-8 max-w-md">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Results Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {isTeacherView 
              ? 'Unable to find results for this student.' 
              : 'Unable to find your test results.'}
          </p>
          <Link
            to={isTeacherView ? `/teacher/test/${testId}` : (userRole === 'teacher' ? '/teacher' : '/student')}
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold hover:brightness-110 transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
            {isTeacherView ? 'Back to Test Details' : 'Back to Dashboard'}
          </Link>
        </div>
      </div>
    );
  }

  const correctAnswers = myResult.answers.filter((answer, index) => 
    answer === test.questions[index].correctAnswer
  ).length;

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Calculate ranking
  const sortedResults = [...testResults].sort((a: LegacyTestResult, b: LegacyTestResult) => b.score - a.score);
  const myRank = sortedResults.findIndex((result: LegacyTestResult) => result.id === myResult.id) + 1;

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-mesh-premium">
      {/* Header */}
      <div className="backdrop-blur-xl bg-white/70 dark:bg-black/40 shadow-sm border-b border-white/20 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <Link
              to={isTeacherView ? `/teacher/test/${testId}` : (userRole === 'teacher' ? '/teacher' : '/student')}
              className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mr-4 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              {isTeacherView ? 'Back to Test Details' : 'Back to Dashboard'}
            </Link>
            <div>
              <h1 className="text-2xl font-bold gradient-text">
                {isTeacherView ? `${myResult.studentName}'s Results` : 'Test Results'}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">{test.title}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Teacher View Badge */}
        {isTeacherView && (
          <div className="mb-6 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4 flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-800">
              <Trophy className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-semibold text-blue-900 dark:text-blue-100">Teacher View</p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                You are viewing {myResult.studentName}'s detailed test submission
              </p>
            </div>
          </div>
        )}
        
        {/* Score Summary */}
        <div className="rounded-3xl border border-white/15 bg-gradient-to-br from-pink-50/80 to-purple-50/80 dark:from-pink-900/20 dark:to-purple-900/20 backdrop-blur-2xl shadow-glow p-8 md:p-12 mb-8">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              {myResult.score >= 70 ? (
                <div className="relative">
                  <Trophy className="h-20 w-20 text-yellow-500 drop-shadow-glow animate-bounce-slow" />
                  <div className="absolute inset-0 bg-yellow-400/30 rounded-full blur-2xl animate-pulse-soft"></div>
                </div>
              ) : (
                <CheckCircle className="h-20 w-20 text-gray-400 dark:text-gray-500" />
              )}
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-3">
              {isTeacherView ? 'Student Score: ' : 'Your Score: '}
              <span className={`${getScoreColor(myResult.score)} bg-gradient-to-r bg-clip-text text-transparent ${
                myResult.score >= 90 ? 'from-green-500 to-emerald-600' :
                myResult.score >= 70 ? 'from-blue-500 to-cyan-600' :
                myResult.score >= 50 ? 'from-yellow-500 to-orange-600' :
                'from-red-500 to-rose-600'
              }`}>
                {myResult.score.toFixed(1)}%
              </span>
            </h2>
            <p className="text-xl text-gray-700 dark:text-gray-300 font-medium">
              {correctAnswers} out of {test.questions.length} correct
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mt-8">
            <div className="rounded-2xl border border-white/25 bg-white/60 dark:bg-white/5 backdrop-blur-xl p-6 text-center transform hover:scale-105 transition-transform">
              <Clock className="h-10 w-10 text-blue-500 mx-auto mb-3" />
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{formatTime(myResult.timeTaken)}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Time Taken</p>
            </div>

            <div className="rounded-2xl border border-white/25 bg-white/60 dark:bg-white/5 backdrop-blur-xl p-6 text-center transform hover:scale-105 transition-transform">
              <Trophy className="h-10 w-10 text-purple-500 mx-auto mb-3" />
              <p className="text-3xl font-bold text-gray-900 dark:text-white">#{myRank}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{isTeacherView ? 'Student Rank' : 'Your Rank'}</p>
            </div>

            <div className="rounded-2xl border border-white/25 bg-white/60 dark:bg-white/5 backdrop-blur-xl p-6 text-center transform hover:scale-105 transition-transform">
              <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-3" />
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{correctAnswers}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Correct Answers</p>
            </div>
          </div>
        </div>

        {/* Question Review */}
        <div className="rounded-3xl border border-white/15 bg-white/70 dark:bg-white/5 backdrop-blur-2xl shadow-inner-glow p-6 md:p-8 mb-8">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-glow text-sm font-bold">
              Q
            </span>
            Question Review
          </h3>
          
          <div className="space-y-6">
            {test.questions.map((question, index) => {
              const userAnswer = myResult.answers[index];
              const correctAnswer = question.correctAnswer;
              const isCorrect = userAnswer === correctAnswer;

              return (
                <div key={index} className="rounded-2xl border border-white/20 bg-white/40 dark:bg-white/5 backdrop-blur-md p-6 transition-all hover:shadow-lg">
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex-1">
                      {index + 1}. {question.question}
                    </h4>
                    <div className="ml-4 shrink-0">
                      {isCorrect ? (
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                          <CheckCircle className="h-6 w-6" />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                          <XCircle className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {question.options.map((option, optionIndex) => {
                      let className = "p-4 rounded-xl border-2 transition-all ";
                      
                      if (optionIndex === correctAnswer) {
                        className += "border-green-400 bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-100 shadow-sm";
                      } else if (optionIndex === userAnswer && !isCorrect) {
                        className += "border-red-400 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100 shadow-sm";
                      } else {
                        className += "border-white/30 dark:border-white/10 bg-white/60 dark:bg-white/5 text-gray-700 dark:text-gray-300";
                      }

                      return (
                        <div key={optionIndex} className={className}>
                          <div className="flex items-center">
                            <span className={`flex items-center justify-center w-8 h-8 rounded-lg border-2 mr-3 text-sm font-bold ${
                              optionIndex === correctAnswer 
                                ? 'border-green-500 bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-100'
                                : optionIndex === userAnswer && !isCorrect
                                ? 'border-red-500 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-100'
                                : 'border-current bg-white/50 dark:bg-white/10'
                            }`}>
                              {String.fromCharCode(65 + optionIndex)}
                            </span>
                            <span className="flex-1 font-medium">{option}</span>
                            {optionIndex === correctAnswer && (
                              <span className="ml-auto text-xs font-bold px-3 py-1 rounded-full bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-100">
                                ✓ Correct
                              </span>
                            )}
                            {optionIndex === userAnswer && !isCorrect && (
                              <span className="ml-auto text-xs font-bold px-3 py-1 rounded-full bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-100">
                                ✗ Your Answer
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Performance Summary */}
        <div className="rounded-3xl border border-white/15 bg-white/70 dark:bg-white/5 backdrop-blur-2xl shadow-inner-glow p-6 md:p-8">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-glow text-sm font-bold">
              📊
            </span>
            Performance Summary
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="rounded-2xl border border-white/20 bg-white/40 dark:bg-white/5 backdrop-blur-md p-6">
              <h4 className="font-bold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Score Breakdown
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 rounded-xl bg-white/60 dark:bg-white/5">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">Correct Answers:</span>
                  <span className="font-bold text-lg text-green-600 dark:text-green-400">{correctAnswers}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-white/60 dark:bg-white/5">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">Incorrect Answers:</span>
                  <span className="font-bold text-lg text-red-600 dark:text-red-400">{test.questions.length - correctAnswers}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-white/60 dark:bg-white/5">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">Accuracy:</span>
                  <span className="font-bold text-lg text-gray-900 dark:text-white">{myResult.score.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/20 bg-white/40 dark:bg-white/5 backdrop-blur-md p-6">
              <h4 className="font-bold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-purple-500" />
                Class Performance
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 rounded-xl bg-white/60 dark:bg-white/5">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">Your Rank:</span>
                  <span className="font-bold text-lg text-purple-600 dark:text-purple-400">#{myRank} of {testResults.length}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-white/60 dark:bg-white/5">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">Average Score:</span>
                  <span className="font-bold text-lg text-gray-900 dark:text-white">
                    {testResults.length > 0 
                      ? (testResults.reduce((sum: number, r: LegacyTestResult) => sum + r.score, 0) / testResults.length).toFixed(1)
                      : '0.0'
                    }%
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-white/60 dark:bg-white/5">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">Highest Score:</span>
                  <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
                    {testResults.length > 0 ? Math.max(...testResults.map((r: LegacyTestResult) => r.score)).toFixed(1) : '0.0'}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TestResults;