import { useState, useEffect, useMemo } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Users, 
  Search,
  Award,
  Clock,
  BookOpen,
  TrendingUp,
  TrendingDown,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useTest } from '../hooks/useTest';
import { LegacyTest, LegacyTestResult } from '../contexts/TestContext';
import { getCachedUUIDFromClerkId } from '../lib/clerkUtils';
import { Skeleton } from '../components/Skeleton';

interface StudentStats {
  studentId: string;
  studentName: string;
  totalAttempts: number;
  averageScore: number;
  bestScore: number;
  lastAttempt: string;
  testsCompleted: number;
}

function ManageStudentsPage() {
  const { user } = useUser();
  const { tests, results } = useTest();
  const [userUUID, setUserUUID] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'score' | 'attempts' | 'recent'>('recent');
  const [filterScore, setFilterScore] = useState<'all' | 'passing' | 'failing'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const studentsPerPage = 10;

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

  // Group results by student
  const studentStats: StudentStats[] = useMemo(() => {
    const studentMap = new Map<string, LegacyTestResult[]>();
    
    myResults.forEach((result: LegacyTestResult) => {
      const existing = studentMap.get(result.studentId) || [];
      existing.push(result);
      studentMap.set(result.studentId, existing);
    });

    return Array.from(studentMap.entries()).map(([studentId, studentResults]) => {
      const scores = studentResults.map(r => r.score);
      const testsSet = new Set(studentResults.map(r => r.testId));
      
      return {
        studentId,
        studentName: studentResults[0]?.studentName || `Student ${studentId.slice(0, 8)}`,
        totalAttempts: studentResults.length,
        averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
        bestScore: Math.max(...scores),
        lastAttempt: studentResults.sort((a, b) => 
          new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
        )[0]?.completedAt || '',
        testsCompleted: testsSet.size
      };
    });
  }, [myResults]);

  // Filter and sort students
  const filteredStudents = useMemo(() => {
    let filtered = [...studentStats];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.studentName.toLowerCase().includes(query) ||
        s.studentId.toLowerCase().includes(query)
      );
    }

    // Score filter
    if (filterScore === 'passing') {
      filtered = filtered.filter(s => s.averageScore >= 50);
    } else if (filterScore === 'failing') {
      filtered = filtered.filter(s => s.averageScore < 50);
    }

    // Sort
    switch (sortBy) {
      case 'name':
        filtered.sort((a, b) => a.studentName.localeCompare(b.studentName));
        break;
      case 'score':
        filtered.sort((a, b) => b.averageScore - a.averageScore);
        break;
      case 'attempts':
        filtered.sort((a, b) => b.totalAttempts - a.totalAttempts);
        break;
      case 'recent':
        filtered.sort((a, b) => new Date(b.lastAttempt).getTime() - new Date(a.lastAttempt).getTime());
        break;
    }

    return filtered;
  }, [studentStats, searchQuery, sortBy, filterScore]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy, filterScore]);

  // Paginated students
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * studentsPerPage;
    const endIndex = startIndex + studentsPerPage;
    return filteredStudents.slice(startIndex, endIndex);
  }, [filteredStudents, currentPage, studentsPerPage]);

  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);

  const exportToCSV = () => {
    const headers = ['Student ID', 'Name', 'Total Attempts', 'Average Score', 'Best Score', 'Tests Completed', 'Last Attempt'];
    const rows = filteredStudents.map(s => [
      s.studentId,
      s.studentName,
      s.totalAttempts,
      s.averageScore.toFixed(1),
      s.bestScore.toFixed(1),
      s.testsCompleted,
      new Date(s.lastAttempt).toLocaleDateString()
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students_report.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

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
              <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">Manage Students</h1>
              <p className="text-gray-600 dark:text-dark-text-secondary">View and track student performance</p>
            </div>
          </div>
          
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-dark-bg-secondary rounded-xl p-6 shadow-sm border border-gray-200 dark:border-dark-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary">Total Students</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">{studentStats.length}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-bg-secondary rounded-xl p-6 shadow-sm border border-gray-200 dark:border-dark-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary">Passing Students</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {studentStats.filter(s => s.averageScore >= 50).length}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-bg-secondary rounded-xl p-6 shadow-sm border border-gray-200 dark:border-dark-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary">Needs Improvement</p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {studentStats.filter(s => s.averageScore < 50).length}
                </p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-bg-secondary rounded-xl p-6 shadow-sm border border-gray-200 dark:border-dark-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary">Total Attempts</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">{myResults.length}</p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <BookOpen className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-dark-bg-secondary rounded-xl p-4 shadow-sm border border-gray-200 dark:border-dark-border mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-500" />
              <select
                title="Filter by score"
                value={filterScore}
                onChange={(e) => setFilterScore(e.target.value as 'all' | 'passing' | 'failing')}
                className="px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary"
              >
                <option value="all">All Students</option>
                <option value="passing">Passing (≥50%)</option>
                <option value="failing">Failing (&lt;50%)</option>
              </select>
            </div>

            <select
              title="Sort students"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'score' | 'attempts' | 'recent')}
              className="px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary"
            >
              <option value="recent">Most Recent</option>
              <option value="name">Name (A-Z)</option>
              <option value="score">Highest Score</option>
              <option value="attempts">Most Attempts</option>
            </select>
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-white dark:bg-dark-bg-secondary rounded-xl shadow-sm border border-gray-200 dark:border-dark-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-dark-bg-tertiary">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">Attempts</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">Avg Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">Best Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">Tests Done</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">Last Active</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
                {paginatedStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <Users className="h-12 w-12 text-gray-300 dark:text-dark-text-tertiary mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-dark-text-secondary">
                        {searchQuery ? 'No students match your search' : 'No students have attempted your tests yet'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedStudents.map((student) => (
                    <tr key={student.studentId} className="hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                            {student.studentName.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-4">
                            <div className="font-medium text-gray-900 dark:text-dark-text-primary">{student.studentName}</div>
                            <div className="text-sm text-gray-500 dark:text-dark-text-secondary">
                              ID: {student.studentId.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-dark-text-secondary">
                        {student.totalAttempts}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`font-medium ${
                          student.averageScore >= 70 ? 'text-green-600 dark:text-green-400' :
                          student.averageScore >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                          'text-red-600 dark:text-red-400'
                        }`}>
                          {student.averageScore.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="flex items-center gap-1 text-gray-900 dark:text-dark-text-primary">
                          <Award className="h-4 w-4 text-yellow-500" />
                          {student.bestScore.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-dark-text-secondary">
                        {student.testsCompleted} / {myTests.length}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-dark-text-secondary">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {student.lastAttempt ? new Date(student.lastAttempt).toLocaleDateString() : 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {student.averageScore >= 50 ? (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            Passing
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                            Needs Help
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {filteredStudents.length > studentsPerPage && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-dark-border flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-dark-text-secondary">
                Showing {((currentPage - 1) * studentsPerPage) + 1} to {Math.min(currentPage * studentsPerPage, filteredStudents.length)} of {filteredStudents.length} students
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-dark-bg-tertiary border border-gray-300 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                        currentPage === page
                          ? 'bg-gray-800 dark:bg-gray-700 text-white border border-gray-600'
                          : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-dark-bg-tertiary border border-gray-300 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-dark-bg-tertiary border border-gray-300 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ManageStudentsPage;
