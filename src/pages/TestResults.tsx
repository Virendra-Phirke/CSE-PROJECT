import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { useTest } from '../hooks/useTest';
import { useTestQuery, useResultsQuery } from '../hooks/quizQueries';
import { LegacyTest, LegacyTestResult } from '../contexts/TestContext';
import { ArrowLeft, CheckCircle, XCircle, Clock, Trophy } from 'lucide-react';
import { getCachedUUIDFromClerkId } from '../lib/clerkUtils';
import { Skeleton, CardSkeleton } from '../components/Skeleton';

function TestResults() {
  const { testId } = useParams<{ testId: string }>();
  const { user } = useUser();
  const { results } = useTest();
  const testQuery = useTestQuery(testId);
  const resultsQuery = useResultsQuery(testQuery.data ? [testQuery.data] : undefined);
  const loading = testQuery.isLoading || resultsQuery.isLoading;
  const [userUUID, setUserUUID] = useState<string>('');

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
  const myResult: LegacyTestResult | undefined = testResults.find((r: LegacyTestResult) => r.studentId === userUUID);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header skeleton */}
          <div className="flex items-center space-x-4">
            <Skeleton className="h-6 w-32" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>

          {/* Score summary skeleton */}
          <div className="rounded-xl p-8 bg-white shadow-sm border space-y-6">
            <div className="text-center space-y-4">
              <Skeleton className="h-16 w-16 mx-auto rounded-full" />
              <Skeleton className="h-8 w-64 mx-auto" />
              <Skeleton className="h-5 w-48 mx-auto" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <CardSkeleton lines={2} />
              <CardSkeleton lines={2} />
              <CardSkeleton lines={2} />
            </div>
          </div>

          {/* Question review skeleton */}
          <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
            <Skeleton className="h-6 w-48" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <Skeleton key={j} className="h-10 w-full rounded-lg" />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Performance summary skeleton */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <Skeleton className="h-6 w-56 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Results Not Found</h1>
          <p className="text-gray-600">Unable to find test results.</p>
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

  const getScoreBg = (score: number) => {
    if (score >= 90) return 'bg-green-100';
    if (score >= 70) return 'bg-blue-100';
    if (score >= 50) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <Link
              to={(user?.unsafeMetadata?.role as string) === 'teacher' ? '/teacher' : '/student'}
              className="flex items-center text-gray-600 hover:text-gray-800 mr-4"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Dashboard
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Test Results</h1>
              <p className="text-gray-600">{test.title}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Score Summary */}
        <div className={`${getScoreBg(myResult.score)} rounded-xl p-8 mb-8`}>
          <div className="text-center">
            <div className="flex justify-center mb-4">
              {myResult.score >= 70 ? (
                <Trophy className="h-16 w-16 text-yellow-500" />
              ) : (
                <CheckCircle className="h-16 w-16 text-gray-500" />
              )}
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Your Score: <span className={getScoreColor(myResult.score)}>
                {myResult.score.toFixed(1)}%
              </span>
            </h2>
            <p className="text-xl text-gray-700">
              {correctAnswers} out of {test.questions.length} correct
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="text-center">
              <div className="bg-white rounded-lg p-4">
                <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{formatTime(myResult.timeTaken)}</p>
                <p className="text-sm text-gray-600">Time Taken</p>
              </div>
            </div>

            <div className="text-center">
              <div className="bg-white rounded-lg p-4">
                <Trophy className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">#{myRank}</p>
                <p className="text-sm text-gray-600">Your Rank</p>
              </div>
            </div>

            <div className="text-center">
              <div className="bg-white rounded-lg p-4">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{correctAnswers}</p>
                <p className="text-sm text-gray-600">Correct Answers</p>
              </div>
            </div>
          </div>
        </div>

        {/* Question Review */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Question Review</h3>
          
          <div className="space-y-6">
            {test.questions.map((question, index) => {
              const userAnswer = myResult.answers[index];
              const correctAnswer = question.correctAnswer;
              const isCorrect = userAnswer === correctAnswer;

              return (
                <div key={index} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="text-lg font-medium text-gray-900 flex-1">
                      {index + 1}. {question.question}
                    </h4>
                    <div className="ml-4">
                      {isCorrect ? (
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      ) : (
                        <XCircle className="h-6 w-6 text-red-600" />
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {question.options.map((option, optionIndex) => {
                      let className = "p-3 rounded-lg border ";
                      
                      if (optionIndex === correctAnswer) {
                        className += "border-green-500 bg-green-50 text-green-900";
                      } else if (optionIndex === userAnswer && !isCorrect) {
                        className += "border-red-500 bg-red-50 text-red-900";
                      } else {
                        className += "border-gray-200 bg-gray-50 text-gray-700";
                      }

                      return (
                        <div key={optionIndex} className={className}>
                          <div className="flex items-center">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-current mr-3 text-sm font-semibold">
                              {String.fromCharCode(65 + optionIndex)}
                            </span>
                            <span>{option}</span>
                            {optionIndex === correctAnswer && (
                              <span className="ml-auto text-xs font-medium">✓ Correct</span>
                            )}
                            {optionIndex === userAnswer && !isCorrect && (
                              <span className="ml-auto text-xs font-medium">✗ Your Answer</span>
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
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Performance Summary</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Score Breakdown</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Correct Answers:</span>
                  <span className="font-semibold text-green-600">{correctAnswers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Incorrect Answers:</span>
                  <span className="font-semibold text-red-600">{test.questions.length - correctAnswers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Accuracy:</span>
                  <span className="font-semibold">{myResult.score.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Class Performance</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Your Rank:</span>
                  <span className="font-semibold">#{myRank} of {testResults.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Average Score:</span>
                  <span className="font-semibold">
                    {testResults.length > 0 
                      ? (testResults.reduce((sum: number, r: LegacyTestResult) => sum + r.score, 0) / testResults.length).toFixed(1)
                      : '0.0'
                    }%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Highest Score:</span>
                  <span className="font-semibold">
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