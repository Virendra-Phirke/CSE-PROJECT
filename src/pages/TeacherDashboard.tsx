import { useState, useEffect } from 'react';
import { useUser, UserButton, SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react';
import { useTest } from '../hooks/useTest';
import { useDeleteTestMutation, useToggleTestStatusMutation } from '../hooks/quizMutations';
import { LegacyTest, LegacyTestResult } from '../contexts/TestContext';
import { useTheme } from '../hooks/useTheme';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  BookOpen, 
  Users, 
  TrendingUp, 
  BarChart3, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  Share2, 
  Moon, 
  Sun,
  Copy,
  CheckCircle
} from 'lucide-react';
import { getCachedUUIDFromClerkId } from '../lib/clerkUtils';
import { Skeleton, CardSkeleton } from '../components/Skeleton';
import { useTestsQuery, useResultsQuery, useQuestionStatsQuery } from '../hooks/quizQueries';
import { DatabaseStatus } from '../components/DatabaseStatus';
import { useToast } from '../components/ui/Toast';

function TeacherDashboard() {
  const { user } = useUser();
  const { isDark, toggleTheme } = useTheme();
  const { tests: legacyTests, results: legacyResults } = useTest();
  const testsQuery = useTestsQuery();
  const resultsQuery = useResultsQuery(testsQuery.data);
  const deleteTestMutation = useDeleteTestMutation();
  const toggleStatusMutation = useToggleTestStatusMutation();
  const loading = testsQuery.isLoading || resultsQuery.isLoading;
  const [userUUID, setUserUUID] = useState<string>('');
  const [copiedTestId, setCopiedTestId] = useState<string | null>(null);
  const { addToast, ToastContainer } = useToast();

  // Generate UUID for current user to filter tests
  useEffect(() => {
    const generateUserUUID = async () => {
      if (user?.id) {
        const uuid = await getCachedUUIDFromClerkId(user.id);
        setUserUUID(uuid);
      }
    };
    generateUserUUID();
  }, [user?.id]);

  const myTests = legacyTests.filter((test: LegacyTest) => test.createdBy === userUUID);
  const myResults = legacyResults.filter((result: LegacyTestResult) => 
    myTests.some((test: LegacyTest) => test.id === result.testId)
  );

  const getTotalStudents = () => {
    const studentIds = new Set(myResults.map((result: LegacyTestResult) => result.studentId));
    return studentIds.size;
  };

  const getAverageScore = () => {
    if (myResults.length === 0) return 0;
    return myResults.reduce((sum: number, result: LegacyTestResult) => sum + result.score, 0) / myResults.length;
  };

  const getTotalTests = () => {
    return myTests.length;
  };

  const handleDeleteTest = async (testId: string) => {
    if (!confirm('Are you sure you want to delete this test? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteTestMutation.mutateAsync({ id: testId });
      addToast({
        type: 'success',
        title: 'Test Deleted',
        message: 'The test has been deleted successfully.'
      });
    } catch (error) {
      console.error('Error deleting test:', error);
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message: 'Failed to delete the test. Please try again.'
      });
    }
  };

  const handleToggleStatus = async (testId: string) => {
    try {
      await toggleStatusMutation.mutateAsync({ 
        id: testId, 
        current: myTests.find(t => t.id === testId)?.isActive || false 
      });
      addToast({
        type: 'success',
        title: 'Status Updated',
        message: 'Test status has been updated successfully.'
      });
    } catch (error) {
      console.error('Error toggling test status:', error);
      addToast({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update test status. Please try again.'
      });
    }
  };

  const copyTestLink = async (testId: string) => {
    const link = `${window.location.origin}/test/${testId}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedTestId(testId);
      addToast({
        type: 'success',
        title: 'Link Copied',
        message: 'Test link has been copied to clipboard.'
      });
      setTimeout(() => setCopiedTestId(null), 2000);
    } catch (error) {
      console.error('Error copying link:', error);
      addToast({
        type: 'error',
        title: 'Copy Failed',
        message: 'Failed to copy link. Please try again.'
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg-primary py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-12">
          {/* Stats cards skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <CardSkeleton lines={2} />
            <CardSkeleton lines={2} />
            <CardSkeleton lines={2} />
          </div>

          {/* Tests table skeleton */}
          <div className="bg-white dark:bg-dark-bg-secondary rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-6">
            <Skeleton className="h-6 w-48 mb-6" />
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-bg-tertiary rounded-lg">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <div className="flex space-x-2">
                    <Skeleton className="h-8 w-20 rounded" />
                    <Skeleton className="h-8 w-8 rounded" />
                    <Skeleton className="h-8 w-8 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg-primary">
      <ToastContainer />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top controls */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">Teacher Dashboard</h1>
            <p className="text-gray-600 dark:text-dark-text-secondary">Welcome back, {user?.firstName}</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-600 dark:text-dark-text-secondary hover:text-gray-800 dark:hover:text-dark-text-primary transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary"
            >
              {isDark ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="btn-primary">Sign In</button>
              </SignInButton>
            </SignedOut>
          </div>
        </div>

        {/* Database Status */}
        <div className="mb-6">
          <DatabaseStatus />
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card-elevated card-gradient p-8 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-dark-text-tertiary mb-2 font-medium">Total Tests</p>
                <p className="text-4xl font-bold gradient-text">{getTotalTests()}</p>
              </div>
              <div className="bg-gradient-to-r from-accent-red-500 to-accent-red-600 p-4 rounded-xl shadow-lg">
                <BookOpen className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>

          <div className="card-elevated card-gradient p-8 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-dark-text-tertiary mb-2 font-medium">Total Students</p>
                <p className="text-4xl font-bold gradient-text">{getTotalStudents()}</p>
              </div>
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-xl shadow-lg">
                <Users className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>

          <div className="card-elevated card-gradient p-8 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-dark-text-tertiary mb-2 font-medium">Average Score</p>
                <p className="text-4xl font-bold gradient-text">{getAverageScore().toFixed(1)}%</p>
              </div>
              <div className="bg-gradient-to-r from-accent-purple-500 to-accent-purple-600 p-4 rounded-xl shadow-lg">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card mb-6">
          <div className="p-6 border-b border-gray-200 dark:border-dark-border">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">Quick Actions</h2>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                to="/teacher/create-test"
                className="flex items-center justify-center p-6 bg-gradient-to-r from-accent-red-500 to-accent-red-600 text-white rounded-xl hover:from-accent-red-600 hover:to-accent-red-700 transition-all transform hover:-translate-y-1 hover:shadow-lg"
              >
                <Plus className="h-6 w-6 mr-2" />
                Create New Test
              </Link>
              
              <div className="flex items-center justify-center p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl">
                <BarChart3 className="h-6 w-6 mr-2" />
                View Analytics
              </div>
              
              <div className="flex items-center justify-center p-6 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl">
                <Users className="h-6 w-6 mr-2" />
                Manage Students
              </div>
              
              <div className="flex items-center justify-center p-6 bg-gradient-to-r from-accent-purple-500 to-accent-purple-600 text-white rounded-xl">
                <BookOpen className="h-6 w-6 mr-2" />
                Question Bank
              </div>
            </div>
          </div>
        </div>

        {/* My Tests */}
        <div className="card">
          <div className="p-6 border-b border-gray-200 dark:border-dark-border">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">My Tests</h2>
              <Link
                to="/teacher/create-test"
                className="btn-primary flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Test
              </Link>
            </div>
          </div>
          
          <div className="p-6">
            {myTests.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="h-16 w-16 text-gray-300 dark:text-dark-text-tertiary mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text-primary mb-2">No tests created yet</h3>
                <p className="text-gray-600 dark:text-dark-text-secondary mb-6">Create your first test to get started with online assessments.</p>
                <Link
                  to="/teacher/create-test"
                  className="btn-primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Test
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {myTests.map((test: LegacyTest) => {
                  const testResults = myResults.filter((result: LegacyTestResult) => result.testId === test.id);
                  const averageScore = testResults.length > 0 
                    ? testResults.reduce((sum: number, result: LegacyTestResult) => sum + result.score, 0) / testResults.length 
                    : 0;

                  return (
                    <div key={test.id} className="card-interactive p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">{test.title}</h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              test.isActive 
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' 
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400'
                            }`}>
                              {test.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          
                          <p className="text-gray-600 dark:text-dark-text-secondary mb-3 line-clamp-2">{test.description}</p>
                          
                          <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-dark-text-tertiary">
                            <span className="flex items-center">
                              <BookOpen className="h-4 w-4 mr-1" />
                              {test.questions.length} questions
                            </span>
                            <span className="flex items-center">
                              <Users className="h-4 w-4 mr-1" />
                              {testResults.length} submissions
                            </span>
                            <span className="flex items-center">
                              <TrendingUp className="h-4 w-4 mr-1" />
                              {averageScore.toFixed(1)}% avg score
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 ml-6">
                          <button
                            onClick={() => copyTestLink(test.id)}
                            className="p-2 text-gray-600 dark:text-dark-text-secondary hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary"
                            title="Copy test link"
                          >
                            {copiedTestId === test.id ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <Share2 className="h-4 w-4" />
                            )}
                          </button>
                          
                          <button
                            onClick={() => handleToggleStatus(test.id)}
                            className="p-2 text-gray-600 dark:text-dark-text-secondary hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary"
                            title={test.isActive ? 'Deactivate test' : 'Activate test'}
                            disabled={toggleStatusMutation.isPending}
                          >
                            {test.isActive ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                          
                          <Link
                            to={`/teacher/edit-test/${test.id}`}
                            className="p-2 text-gray-600 dark:text-dark-text-secondary hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary"
                            title="Edit test"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          
                          <button
                            onClick={() => handleDeleteTest(test.id)}
                            className="p-2 text-gray-600 dark:text-dark-text-secondary hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary"
                            title="Delete test"
                            disabled={deleteTestMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent Results */}
        {myResults.length > 0 && (
          <div className="card mt-6">
            <div className="p-6 border-b border-gray-200 dark:border-dark-border">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">Recent Results</h2>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                {myResults.slice(-10).reverse().map((result: LegacyTestResult) => {
                  const test = myTests.find((t: LegacyTest) => t.id === result.testId);
                  return (
                    <div key={result.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-bg-tertiary rounded-lg">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary">{test?.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                          {result.studentName} • {new Date(result.completedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold gradient-text">{result.score.toFixed(1)}%</p>
                        <p className="text-sm text-gray-600 dark:text-dark-text-tertiary">
                          {Math.round((result.score / 100) * result.totalQuestions)}/{result.totalQuestions}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TeacherDashboard;