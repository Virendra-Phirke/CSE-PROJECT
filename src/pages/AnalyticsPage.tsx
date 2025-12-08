import { useState, useEffect, useMemo } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown,
  Users, 
  BookOpen, 
  BarChart3,
  PieChart,
  Clock,
  Award,
  Target
} from 'lucide-react';
import { useTest } from '../hooks/useTest';
import { LegacyTest, LegacyTestResult } from '../contexts/TestContext';
import { getCachedUUIDFromClerkId } from '../lib/clerkUtils';
import { Skeleton } from '../components/Skeleton';

function AnalyticsPage() {
  const { user } = useUser();
  const { tests, results } = useTest();
  const [userUUID, setUserUUID] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'week' | 'month' | 'all'>('all');

  useEffect(() => {
    const init = async () => {
      if (user?.id) {
        const uuid = await getCachedUUIDFromClerkId(user.id);
        setUserUUID(uuid);
      }
      setLoading(false);
    };
    init();
  }, [user?.id]);

  const myTests = useMemo(() => 
    tests.filter((test: LegacyTest) => test.createdBy === userUUID),
    [tests, userUUID]
  );

  const myResults = useMemo(() => 
    results.filter((result: LegacyTestResult) => 
      myTests.some((test: LegacyTest) => test.id === result.testId)
    ),
    [results, myTests]
  );

  // Filter results by time range
  const filteredResults = useMemo(() => {
    const now = new Date();
    return myResults.filter((result: LegacyTestResult) => {
      const resultDate = new Date(result.completedAt);
      if (selectedTimeRange === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return resultDate >= weekAgo;
      } else if (selectedTimeRange === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return resultDate >= monthAgo;
      }
      return true;
    });
  }, [myResults, selectedTimeRange]);

  // Analytics calculations
  const analytics = useMemo(() => {
    const totalStudents = new Set(filteredResults.map((r: LegacyTestResult) => r.studentId)).size;
    const totalAttempts = filteredResults.length;
    const averageScore = totalAttempts > 0 
      ? filteredResults.reduce((sum: number, r: LegacyTestResult) => sum + r.score, 0) / totalAttempts 
      : 0;
    const passRate = totalAttempts > 0 
      ? (filteredResults.filter((r: LegacyTestResult) => r.score >= 50).length / totalAttempts) * 100 
      : 0;
    const avgTimePerTest = totalAttempts > 0 
      ? filteredResults.reduce((sum: number, r: LegacyTestResult) => sum + (r.timeTaken || 0), 0) / totalAttempts 
      : 0;

    // Score distribution
    const scoreRanges = [
      { label: '0-20%', count: 0, color: 'bg-red-500' },
      { label: '21-40%', count: 0, color: 'bg-orange-500' },
      { label: '41-60%', count: 0, color: 'bg-yellow-500' },
      { label: '61-80%', count: 0, color: 'bg-blue-500' },
      { label: '81-100%', count: 0, color: 'bg-green-500' },
    ];

    filteredResults.forEach((r: LegacyTestResult) => {
      if (r.score <= 20) scoreRanges[0].count++;
      else if (r.score <= 40) scoreRanges[1].count++;
      else if (r.score <= 60) scoreRanges[2].count++;
      else if (r.score <= 80) scoreRanges[3].count++;
      else scoreRanges[4].count++;
    });

    // Test performance
    const testPerformance = myTests.map((test: LegacyTest) => {
      const testResults = filteredResults.filter((r: LegacyTestResult) => r.testId === test.id);
      const avgScore = testResults.length > 0 
        ? testResults.reduce((sum: number, r: LegacyTestResult) => sum + r.score, 0) / testResults.length 
        : 0;
      return {
        id: test.id,
        title: test.title,
        attempts: testResults.length,
        avgScore,
        passRate: testResults.length > 0 
          ? (testResults.filter((r: LegacyTestResult) => r.score >= 50).length / testResults.length) * 100 
          : 0
      };
    });

    return {
      totalStudents,
      totalAttempts,
      averageScore,
      passRate,
      avgTimePerTest,
      scoreRanges,
      testPerformance
    };
  }, [filteredResults, myTests]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg-primary p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/teacher" className="p-2 hover:bg-gray-200 dark:hover:bg-dark-bg-tertiary rounded-lg transition-colors">
              <ArrowLeft className="h-6 w-6 text-gray-600 dark:text-dark-text-secondary" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">Analytics</h1>
              <p className="text-gray-600 dark:text-dark-text-secondary">Track your tests performance and student progress</p>
            </div>
          </div>
          
          {/* Time Range Filter */}
          <div className="flex gap-2">
            {(['week', 'month', 'all'] as const).map(range => (
              <button
                key={range}
                onClick={() => setSelectedTimeRange(range)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedTimeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-dark-bg-secondary text-gray-700 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary'
                }`}
              >
                {range === 'week' ? 'This Week' : range === 'month' ? 'This Month' : 'All Time'}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-dark-bg-secondary rounded-xl p-6 shadow-sm border border-gray-200 dark:border-dark-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary">Total Students</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">{analytics.totalStudents}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-bg-secondary rounded-xl p-6 shadow-sm border border-gray-200 dark:border-dark-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary">Total Attempts</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">{analytics.totalAttempts}</p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <BookOpen className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-bg-secondary rounded-xl p-6 shadow-sm border border-gray-200 dark:border-dark-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary">Average Score</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">{analytics.averageScore.toFixed(1)}%</p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Target className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-bg-secondary rounded-xl p-6 shadow-sm border border-gray-200 dark:border-dark-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary">Pass Rate</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">{analytics.passRate.toFixed(1)}%</p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Award className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Score Distribution */}
          <div className="bg-white dark:bg-dark-bg-secondary rounded-xl p-6 shadow-sm border border-gray-200 dark:border-dark-border">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-4 flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Score Distribution
            </h3>
            <div className="space-y-3">
              {analytics.scoreRanges.map((range, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 dark:text-dark-text-secondary w-20">{range.label}</span>
                  <div className="flex-1 bg-gray-200 dark:bg-dark-bg-tertiary rounded-full h-4 overflow-hidden">
                    <div 
                      className={`h-full ${range.color} transition-all duration-500`}
                      style={{ width: `${analytics.totalAttempts > 0 ? (range.count / analytics.totalAttempts) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-dark-text-primary w-12 text-right">
                    {range.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Average Time */}
          <div className="bg-white dark:bg-dark-bg-secondary rounded-xl p-6 shadow-sm border border-gray-200 dark:border-dark-border">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Performance Overview
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-dark-bg-tertiary rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary">Avg. Time per Test</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">
                  {Math.floor(analytics.avgTimePerTest / 60)}m {Math.floor(analytics.avgTimePerTest % 60)}s
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-dark-bg-tertiary rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary">Total Tests</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">{myTests.length}</p>
              </div>
              <div className="bg-gray-50 dark:bg-dark-bg-tertiary rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary">Active Tests</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {myTests.filter((t: LegacyTest) => t.isActive).length}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-dark-bg-tertiary rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary">Inactive Tests</p>
                <p className="text-2xl font-bold text-gray-500 dark:text-gray-400">
                  {myTests.filter((t: LegacyTest) => !t.isActive).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Test Performance Table */}
        <div className="bg-white dark:bg-dark-bg-secondary rounded-xl shadow-sm border border-gray-200 dark:border-dark-border overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-dark-border">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Test Performance
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-dark-bg-tertiary">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">Test</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">Attempts</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">Avg Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">Pass Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
                {analytics.testPerformance.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-dark-text-secondary">
                      No test data available yet. Create tests and wait for students to attempt them.
                    </td>
                  </tr>
                ) : (
                  analytics.testPerformance.map((test) => (
                    <tr key={test.id} className="hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-gray-900 dark:text-dark-text-primary">{test.title}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-dark-text-secondary">
                        {test.attempts}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`font-medium ${
                          test.avgScore >= 70 ? 'text-green-600 dark:text-green-400' :
                          test.avgScore >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                          'text-red-600 dark:text-red-400'
                        }`}>
                          {test.avgScore.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-dark-text-secondary">
                        {test.passRate.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {test.avgScore >= 50 ? (
                          <TrendingUp className="h-5 w-5 text-green-500" />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-red-500" />
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsPage;
