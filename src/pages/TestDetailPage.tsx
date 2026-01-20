import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { useTestQuery, useResultsQuery } from '../hooks/quizQueries';
import { LegacyTest, LegacyTestResult } from '../contexts/TestContext';
import { 
  ArrowLeft, 
  Users, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye,
  Calendar,
  Award,
  BarChart3,
  Download
} from 'lucide-react';
import { getCachedUUIDFromClerkId } from '../lib/clerkUtils';
import { Skeleton, CardSkeleton } from '../components/Skeleton';

interface StudentSubmission extends LegacyTestResult {
  studentName: string;
  rank: number;
  grade: string;
}

function TestDetailPage() {
  const { testId } = useParams<{ testId: string }>();
  const { user } = useUser();
  const navigate = useNavigate();
  const testQuery = useTestQuery(testId);
  const resultsQuery = useResultsQuery(testQuery.data ? [testQuery.data] : undefined);
  const loading = testQuery.isLoading || resultsQuery.isLoading;
  const [userUUID, setUserUUID] = useState<string>('');
  const [sortBy, setSortBy] = useState<'score' | 'date' | 'time'>('score');

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

  // Check if user is the test creator
  const isTestCreator = test?.createdBy === userUUID;

  useEffect(() => {
    if (!loading && test && !isTestCreator) {
      navigate('/teacher');
    }
  }, [loading, test, isTestCreator, navigate]);

  // Calculate statistics
  const getStatistics = () => {
    if (testResults.length === 0) {
      return {
        totalSubmissions: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        averageTime: 0,
        passRate: 0
      };
    }

    const scores = testResults.map(r => r.score);
    const times = testResults.map(r => r.timeTaken);
    const passingScore = 60;

    return {
      totalSubmissions: testResults.length,
      averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      highestScore: Math.max(...scores),
      lowestScore: Math.min(...scores),
      averageTime: times.reduce((a, b) => a + b, 0) / times.length,
      passRate: (testResults.filter(r => r.score >= passingScore).length / testResults.length) * 100
    };
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Export submissions to CSV
  const exportToCSV = () => {
    if (!test || submissions.length === 0) return;

    // Define CSV headers
    const headers = ['Rank', 'Student Name', 'Score (%)', 'Correct Answers', 'Total Questions', 'Time Taken', 'Completed At'];
    
    // Prepare CSV rows
    const rows = submissions.map((submission) => [
      submission.rank,
      submission.studentName,
      submission.score.toFixed(1),
      Math.round((submission.score / 100) * submission.totalQuestions),
      submission.totalQuestions,
      formatTime(submission.timeTaken),
      new Date(submission.completedAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${test.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_submissions_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Prepare submissions with rankings
  const submissions: StudentSubmission[] = testResults
    .map((result) => ({
      ...result,
      studentName: result.studentName || 'Anonymous',
      rank: 0,
      grade: ''
    }))
    .sort((a, b) => b.score - a.score)
    .map((result, index) => ({
      ...result,
      rank: index + 1
    }));

  // Apply sorting
  const sortedSubmissions = [...submissions].sort((a, b) => {
    switch (sortBy) {
      case 'score':
        return b.score - a.score;
      case 'date':
        return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
      case 'time':
        return a.timeTaken - b.timeTaken;
      default:
        return 0;
    }
  });

  // Apply grade filter
  const filteredSubmissions = sortedSubmissions;

  const stats = getStatistics();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg-primary py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-6 w-32" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} lines={2} />
            ))}
          </div>

          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <CardSkeleton key={i} lines={3} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg-primary flex items-center justify-center p-4">
        <div className="text-center card p-8 max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-4">Test Not Found</h2>
          <p className="text-gray-600 dark:text-dark-text-secondary mb-6">
            The test you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Link to="/teacher" className="btn-primary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg-primary py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Link
              to="/teacher"
              className="inline-flex items-center text-sm text-gray-600 dark:text-dark-text-secondary hover:text-accent-red-600 dark:hover:text-accent-red-400 mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary mb-2">
              {test.title}
            </h1>
            <p className="text-gray-600 dark:text-dark-text-secondary mb-4">{test.description}</p>
            <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-dark-text-tertiary">
              <span className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                {test.duration} minutes
              </span>
              <span className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-1" />
                {test.questions.length} questions
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                test.isActive 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' 
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400'
              }`}>
                {test.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={exportToCSV}
              disabled={testResults.length === 0}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg-tertiary text-gray-700 dark:text-dark-text-primary hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export submissions to CSV"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </button>
            <Link
              to={`/teacher/edit-test/${testId}`}
              className="btn-secondary"
            >
              Edit Test
            </Link>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card-elevated card-gradient p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-dark-text-tertiary font-medium">
                Total Submissions
              </span>
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-3xl font-bold gradient-text">{stats.totalSubmissions}</p>
          </div>

          <div className="card-elevated card-gradient p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-dark-text-tertiary font-medium">
                Average Score
              </span>
              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-3xl font-bold gradient-text">{stats.averageScore.toFixed(1)}%</p>
          </div>

          <div className="card-elevated card-gradient p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-dark-text-tertiary font-medium">
                Pass Rate
              </span>
              <Award className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-3xl font-bold gradient-text">{stats.passRate.toFixed(1)}%</p>
          </div>

          <div className="card-elevated card-gradient p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-dark-text-tertiary font-medium">
                Avg. Time
              </span>
              <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <p className="text-3xl font-bold gradient-text">{formatTime(Math.round(stats.averageTime))}</p>
          </div>
        </div>

        {/* Additional Stats */}
        {testResults.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-dark-text-tertiary mb-1">Highest Score</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {stats.highestScore.toFixed(1)}%
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-dark-text-tertiary mb-1">Lowest Score</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {stats.lowestScore.toFixed(1)}%
                  </p>
                </div>
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                  <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-dark-text-tertiary mb-1">Unique Students</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {new Set(testResults.map(r => r.studentId)).size}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Submissions List */}
        <div className="card">
          <div className="p-6 border-b border-gray-200 dark:border-dark-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">
                Student Submissions
              </h2>
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4 text-gray-500" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'score' | 'date' | 'time')}
                  className="px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-red-500"
                  aria-label="Sort submissions"
                >
                  <option value="score">Sort by Score</option>
                  <option value="date">Sort by Date</option>
                  <option value="time">Sort by Time</option>
                </select>
              </div>
            </div>
          </div>

          <div className="p-6">
            {filteredSubmissions.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
                  <Users className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-2">
                  No submissions yet
                </h3>
                <p className="text-gray-600 dark:text-dark-text-secondary">
                  Students haven't taken this test yet.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-dark-border">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-dark-text-secondary">
                        Rank
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-dark-text-secondary">
                        Student Name
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-dark-text-secondary">
                        Score
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-dark-text-secondary">
                        Time Taken
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-dark-text-secondary">
                        Completed At
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-dark-text-secondary">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubmissions.map((submission) => (
                      <tr
                        key={submission.id}
                        className="border-b border-gray-100 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary transition-colors"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center">
                            {submission.rank <= 3 ? (
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                submission.rank === 1 
                                  ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white' 
                                  : submission.rank === 2 
                                  ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white'
                                  : 'bg-gradient-to-br from-orange-400 to-orange-600 text-white'
                              }`}>
                                {submission.rank}
                              </div>
                            ) : (
                              <span className="text-gray-600 dark:text-dark-text-secondary font-medium">
                                #{submission.rank}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-medium text-gray-900 dark:text-dark-text-primary">
                            {submission.studentName}
                          </p>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center">
                            <div className="text-lg font-bold gradient-text">
                              {submission.score.toFixed(1)}%
                            </div>
                            <span className="ml-2 text-sm text-gray-500 dark:text-dark-text-tertiary">
                              ({Math.round((submission.score / 100) * submission.totalQuestions)}/{submission.totalQuestions})
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center text-gray-600 dark:text-dark-text-secondary">
                            <Clock className="h-4 w-4 mr-2" />
                            {formatTime(submission.timeTaken)}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center text-gray-600 dark:text-dark-text-secondary text-sm">
                            <Calendar className="h-4 w-4 mr-2" />
                            {new Date(submission.completedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <Link
                            to={`/results/${testId}?student=${submission.studentId}`}
                            className="inline-flex items-center px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Score Distribution */}
        {testResults.length > 0 && (
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-6 flex items-center gap-2">
              <span className="text-2xl">📊</span>
              Score Distribution
            </h2>
            <div className="space-y-4">
              {[
                { range: '81-100%', min: 81, max: 100, color: 'bg-blue-500' },
                { range: '61-80%', min: 61, max: 80, color: 'bg-green-500' },
                { range: '41-60%', min: 41, max: 60, color: 'bg-yellow-500' },
                { range: '21-40%', min: 21, max: 40, color: 'bg-orange-500' },
                { range: '0-20%', min: 0, max: 20, color: 'bg-red-500' }
              ].map((bucket) => {
                const count = submissions.filter(s => s.score >= bucket.min && s.score <= bucket.max).length;
                const percentage = testResults.length > 0 ? (count / testResults.length) * 100 : 0;
                const widthPercentage = Math.max(percentage, 0);
                
                return (
                  <div key={bucket.range} className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-20 text-right">
                      {bucket.range}
                    </span>
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-8 relative overflow-hidden">
                      <div 
                        className={`${bucket.color} h-full rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-3`}
                        style={{ width: `${widthPercentage}%` }}
                      >
                        {count > 0 && (
                          <span className="text-white font-bold text-sm">{count}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400 w-16">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TestDetailPage;
