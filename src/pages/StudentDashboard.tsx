import { useState, useEffect } from 'react';
import { useUser, UserButton, SignedIn, SignedOut } from '@clerk/clerk-react';
import { useTest } from '../hooks/useTest';
import { LegacyTest, LegacyTestResult } from '../contexts/TestContext';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, CheckCircle, TrendingUp, Award, Home, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { getCachedUUIDFromClerkId } from '../lib/clerkUtils';
import { Skeleton, CardSkeleton } from '../components/Skeleton';
import { useTestsQuery, useResultsQuery } from '../hooks/quizQueries';
import { DatabaseStatus } from '../components/DatabaseStatus';

function StudentDashboard() {
  const { user } = useUser();
  const { tests: legacyTests, results: legacyResults } = useTest();
  const testsQuery = useTestsQuery();
  const resultsQuery = useResultsQuery(testsQuery.data);
  const loading = testsQuery.isLoading || resultsQuery.isLoading;
  const [userUUID, setUserUUID] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [resultsPage, setResultsPage] = useState(1);
  const testsPerPage = 6;
  const resultsPerPage = 5;

  // Generate UUID for current user to filter results
  useEffect(() => {
    const generateUserUUID = async () => {
      if (user?.id) {
        const uuid = await getCachedUUIDFromClerkId(user.id);
        setUserUUID(uuid);
      }
    };
    generateUserUUID();
  }, [user?.id]);

  const availableTests = legacyTests.filter((test: LegacyTest) => test.isActive);
  const myResults = legacyResults.filter((result: LegacyTestResult) => result.studentId === userUUID);
  const completedTestIds = myResults.map((result: LegacyTestResult) => result.testId);

  // Filter tests based on search query
  const filteredTests = availableTests.filter((test: LegacyTest) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return test.title.toLowerCase().includes(query) || 
           test.description.toLowerCase().includes(query);
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredTests.length / testsPerPage);
  const startIndex = (currentPage - 1) * testsPerPage;
  const endIndex = startIndex + testsPerPage;
  const paginatedTests = filteredTests.slice(startIndex, endIndex);

  const getAverageScore = () => {
    if (myResults.length === 0) return 0;
    return myResults.reduce((sum: number, result: LegacyTestResult) => sum + result.score, 0) / myResults.length;
  };

  const getBestScore = () => {
    if (myResults.length === 0) return 0;
    return Math.max(...myResults.map((result: LegacyTestResult) => result.score));
  };

  const getCompletedTestsCount = () => {
    return myResults.length;
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

          {/* Available tests skeleton */}
          <div className="bg-white dark:bg-dark-bg-secondary rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-6">
            <Skeleton className="h-6 w-48 mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-6 border rounded-xl bg-gray-50 dark:bg-dark-bg-tertiary border-gray-200 dark:border-dark-border space-y-4">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              ))}
            </div>
          </div>

          {/* Recent results skeleton */}
          <div className="bg-white dark:bg-dark-bg-secondary rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-6">
            <Skeleton className="h-6 w-48 mb-6" />
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-bg-tertiary rounded-lg">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="space-y-2 text-right">
                    <Skeleton className="h-5 w-16 ml-auto" />
                    <Skeleton className="h-4 w-20 ml-auto" />
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top controls */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">Student Dashboard</h1>
            <p className="text-gray-600 dark:text-dark-text-secondary">Welcome back, {user?.firstName}</p>
          </div>
          <div className="flex items-center space-x-4">
            <Link 
              to="/" 
              className="flex items-center justify-center w-10 h-10 bg-gray-800 dark:bg-gray-900 text-gray-200 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-800 transition-all shadow-md hover:shadow-lg"
              title="Home"
            >
              <Home className="h-5 w-5" />
            </Link>
            <SignedIn>
              <div className="flex items-center justify-center w-10 h-10 rounded-lg overflow-hidden ring-2 ring-gray-700 dark:ring-gray-600 hover:ring-pink-500 transition-all shadow-md hover:shadow-lg">
                <UserButton 
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      avatarBox: "w-10 h-10",
                      userButtonTrigger: "focus:shadow-none"
                    }
                  }}
                />
              </div>
            </SignedIn>
            <SignedOut>
              <a href="/#/auth/signin" className="btn-primary">Sign In</a>
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
                <p className="text-sm text-gray-600 dark:text-dark-text-tertiary mb-2 font-medium">Tests Completed</p>
                <p className="text-4xl font-bold gradient-text">{getCompletedTestsCount()}</p>
              </div>
              <div className="bg-gradient-to-r from-accent-red-500 to-accent-red-600 p-4 rounded-xl shadow-lg">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>

          <div className="card-elevated card-gradient p-8 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-dark-text-tertiary mb-2 font-medium">Average Score</p>
                <p className="text-4xl font-bold gradient-text">{getAverageScore().toFixed(1)}%</p>
              </div>
              <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 rounded-xl shadow-lg">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>

          <div className="card-elevated card-gradient p-8 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-dark-text-tertiary mb-2 font-medium">Best Score</p>
                <p className="text-4xl font-bold gradient-text">{getBestScore().toFixed(1)}%</p>
              </div>
              <div className="bg-gradient-to-r from-accent-purple-500 to-accent-purple-600 p-4 rounded-xl shadow-lg">
                <Award className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Available Tests */}
        <div className="card mb-6">
          <div className="p-6 border-b border-gray-200 dark:border-dark-border">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">Available Tests</h2>
              
              {/* Search Bar */}
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Search tests..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1); // Reset to page 1 on search
                  }}
                  className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-600 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>
          
          <div className="p-6">
            {filteredTests.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="h-16 w-16 text-gray-300 dark:text-dark-text-tertiary mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text-primary mb-2">
                  {searchQuery ? 'No tests found' : 'No tests available'}
                </h3>
                <p className="text-gray-600 dark:text-dark-text-secondary">
                  {searchQuery ? 'Try adjusting your search terms.' : 'Check back later for new tests from your teachers.'}
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedTests.map((test: LegacyTest) => {
                  const isCompleted = completedTestIds.includes(test.id);
                  const result = myResults.find((r: LegacyTestResult) => r.testId === test.id);

                  return (
                    <div key={test.id} className="card-interactive p-8">
                      <div className="flex justify-between items-start mb-6">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">{test.title}</h3>
                        <span className={`px-4 py-2 rounded-full text-sm font-medium border ${
                          isCompleted 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800' 
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                        }`}>
                          {isCompleted ? 'Completed' : 'Available'}
                        </span>
                      </div>

                      <p className="text-gray-600 dark:text-dark-text-secondary mb-6 line-clamp-2">{test.description}</p>

                      <div className="inline-flex items-center text-sm text-gray-500 dark:text-dark-text-tertiary bg-gray-50 dark:bg-dark-bg-tertiary px-3 py-2 rounded-lg mb-6">
                        <Clock className="h-4 w-4 mr-2" />
                        {test.duration} minutes • {test.questions.length} questions
                      </div>

                      {isCompleted && result && (
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-6">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-green-700 dark:text-green-300">Your Score:</span>
                            <span className="text-2xl font-bold text-green-600 dark:text-green-400">{result.score.toFixed(1)}%</span>
                          </div>
                        </div>
                      )}

                      <div className="w-full">
                        {!isCompleted ? (
                          <Link
                            to={`/test/${test.id}`}
                            className="start-test-btn"
                          >
                            <span>Start Test</span>
                          </Link>
                        ) : (
                          <Link
                            to={`/results/${test.id}`}
                            className="btn-secondary flex-1 text-center"
                          >
                            View Results
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              {filteredTests.length > testsPerPage && (
                <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredTests.length)} of {filteredTests.length} tests
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => prev - 1)}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline">Previous</span>
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 rounded-lg font-medium transition-all ${
                          currentPage === page
                            ? 'bg-gray-800 dark:bg-gray-700 text-white'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    
                    <button
                      onClick={() => setCurrentPage(prev => prev + 1)}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
            )}
          </div>
        </div>

        {/* Recent Results */}
        {myResults.length > 0 && (
          <div className="card">
            <div className="p-6 border-b border-gray-200 dark:border-dark-border">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">Recent Results</h2>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                {myResults
                  .slice()
                  .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
                  .slice((resultsPage - 1) * resultsPerPage, resultsPage * resultsPerPage)
                  .map((result: LegacyTestResult) => {
                    const test = legacyTests.find((t: LegacyTest) => t.id === result.testId);
                    return (
                      <div key={result.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-bg-tertiary rounded-lg">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary">{test?.title}</h3>
                          <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                            Completed on {new Date(result.completedAt).toLocaleDateString()}
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

              {/* Pagination Controls for Recent Results */}
              {myResults.length > resultsPerPage && (
                <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {((resultsPage - 1) * resultsPerPage) + 1} to {Math.min(resultsPage * resultsPerPage, myResults.length)} of {myResults.length} results
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setResultsPage(prev => prev - 1)}
                      disabled={resultsPage === 1}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline">Previous</span>
                    </button>
                    
                    {Array.from({ length: Math.ceil(myResults.length / resultsPerPage) }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setResultsPage(page)}
                        className={`px-3 py-2 rounded-lg font-medium transition-all ${
                          resultsPage === page
                            ? 'bg-gray-800 dark:bg-gray-700 text-white'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    
                    <button
                      onClick={() => setResultsPage(prev => prev + 1)}
                      disabled={resultsPage === Math.ceil(myResults.length / resultsPerPage)}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default StudentDashboard;