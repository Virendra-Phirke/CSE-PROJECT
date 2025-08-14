import { useState, useEffect } from 'react';
import { useUser, UserButton } from '@clerk/clerk-react';
import { useTest } from '../hooks/useTest';
import { LegacyTest, LegacyTestResult } from '../contexts/TestContext';
import { Plus, BarChart3, Users, Clock, TrendingUp, Edit, Trash2, Share2, Copy, Eye, EyeOff, Sun, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getCachedUUIDFromClerkId } from '../lib/clerkUtils';
import { useQuestionStatsQuery } from '../hooks/quizQueries';
import { useDeleteTestMutation, useToggleTestStatusMutation } from '../hooks/quizMutations';
import { useTheme } from '../hooks/useTheme';
import { DatabaseStatus } from '../components/DatabaseStatus';

function TeacherDashboard() {
  const { user } = useUser();
  const { tests: legacyTests, results: legacyResults, generateTestLink } = useTest();
  const [activeTab, setActiveTab] = useState('overview');
  const [userUUID, setUserUUID] = useState<string>('');
  const [copiedTestId, setCopiedTestId] = useState<string | null>(null);
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const deleteMutation = useDeleteTestMutation();
  const toggleMutation = useToggleTestStatusMutation();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingToggleId, setPendingToggleId] = useState<string | null>(null);
  const { isDark, toggleTheme } = useTheme();
  // React Query per-question stats only for currently expanded test
  const { data: expandedQuestionStats, isLoading: questionStatsLoading } = useQuestionStatsQuery(expandedTestId || undefined, !!expandedTestId);

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
  const allResults = legacyResults.filter((result: LegacyTestResult) => 
    myTests.some(test => test.id === result.testId)
  );

  // Toast helper
  const pushToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // Replace legacy delete with optimistic mutation
  const handleDeleteTest = async (testId: string, testTitle: string) => {
    if (!window.confirm(`Delete "${testTitle}"? This cannot be undone.`)) return;
    setPendingDeleteId(testId);
    deleteMutation.mutate(
      { id: testId },
      {
        onSuccess: () => {
          pushToast('success', 'Test deleted');
        },
        onError: (err: unknown) => {
          console.error('Delete failed', err);
          pushToast('error', 'Delete failed');
        },
        onSettled: () => setPendingDeleteId(null)
      }
    );
  };

  const handleToggleTestStatus = async (testId: string, testTitle: string, currentStatus: boolean) => {
    const action = currentStatus ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} "${testTitle}"?`)) return;
    setPendingToggleId(testId);
    toggleMutation.mutate(
      { id: testId, current: currentStatus },
      {
        onSuccess: () => {
          pushToast('success', `Test ${action}d`);
        },
        onError: (err: unknown) => {
          console.error('Toggle failed', err);
          pushToast('error', 'Status change failed');
        },
        onSettled: () => setPendingToggleId(null)
      }
    );
  };

  const handleCopyLink = async (testId: string) => {
    const link = generateTestLink(testId);
    try {
      await navigator.clipboard.writeText(link);
      setCopiedTestId(testId);
      
      // Show the link in an alert for user reference
      alert(`Test link copied to clipboard!\n\n${link}\n\nShare this link with your students to take the test.`);
      
      setTimeout(() => setCopiedTestId(null), 3000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      // Fallback: show the link in an alert so user can copy manually
      alert(`Copy this link to share with students:\n\n${link}`);
    }
  };

  // compute per-test stats (restored after refactor)
  const getTestStats = (testId: string) => {
    const testResults = legacyResults.filter((result: LegacyTestResult) => result.testId === testId);
    if (testResults.length === 0) return null;
    const avgScore = testResults.reduce((sum: number, result: LegacyTestResult) => sum + result.score, 0) / testResults.length;
    const highestScore = Math.max(...testResults.map((r: LegacyTestResult) => r.score));
    const totalStudents = testResults.length;
    return { avgScore, highestScore, totalStudents };
  };

  const getOverallStats = () => {
    const totalTests = myTests.length;
    const totalStudents = new Set(allResults.map((r: LegacyTestResult) => r.studentId)).size;
    const avgScore = allResults.length > 0 ? allResults.reduce((s: number, r: LegacyTestResult) => s + r.score, 0) / allResults.length : 0;
    return { totalTests, totalStudents, avgScore };
  };
  const overallStats = getOverallStats();

  const getPerTestResults = (testId: string) => legacyResults
      .filter((r: LegacyTestResult) => r.testId === testId)
      .sort((a, b) => b.score - a.score || a.timeTaken - b.timeTaken);

  return (
    <div className="min-h-screen bg-[#070707] dark:bg-[#070707]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-10 flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white mb-1">Teacher Dashboard</h1>
            <p className="text-sm text-gray-400">Welcome back, {user?.firstName || user?.emailAddresses?.[0]?.emailAddress}</p>
          </div>
          <div className="flex items-center gap-3 self-start">
            <button
              onClick={toggleTheme}
              className="h-9 w-9 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white transition-colors"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <UserButton afterSignOutUrl="/" appearance={{ elements: { userButtonPopoverCard: 'bg-[#111827] border border-white/10 backdrop-blur-xl' } }} />
          </div>
        </div>
        {toast && (
        {/* Database Status */}
        <div className="mb-6">
          <DatabaseStatus />
        </div>
        {toast && (
          <div
            role="status"
            className={`mb-6 rounded-md border px-4 py-3 text-sm ${toast.type === 'success' ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300' : 'border-red-400/30 bg-red-500/10 text-red-300'}`}
          >
            {toast.message}
          </div>
        )}
        {/* Stat Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="relative rounded-lg border border-white/10 bg-[#0e0e0e] px-6 py-5 overflow-hidden group">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-purple-600/10 to-purple-900/5" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-medium mb-2">Total Tests</p>
                <p className="text-3xl font-semibold text-purple-400">{overallStats.totalTests}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">
                <BarChart3 className="h-5 w-5" />
              </div>
            </div>
          </div>
          <div className="relative rounded-lg border border-white/10 bg-[#0e0e0e] px-6 py-5 overflow-hidden group">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-indigo-600/10 to-indigo-900/5" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-medium mb-2">Total Students</p>
                <p className="text-3xl font-semibold text-indigo-400">{overallStats.totalStudents}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </div>
          <div className="relative rounded-lg border border-white/10 bg-[#0e0e0e] px-6 py-5 overflow-hidden group">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-emerald-600/10 to-emerald-900/5" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-medium mb-2">Average Score</p>
                <p className="text-3xl font-semibold text-emerald-400">{overallStats.avgScore.toFixed(1)}%</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Container */}
        <div className="rounded-lg border border-white/10 bg-[#0e0e0e] overflow-hidden mb-8">
          <div className="flex relative">
            <button onClick={() => setActiveTab('overview')} className={`flex-1 py-4 text-sm font-medium tracking-wide transition-colors ${activeTab==='overview' ? 'text-purple-400' : 'text-gray-400 hover:text-gray-200'}`}>Test Overview</button>
            <button onClick={() => setActiveTab('results')} className={`flex-1 py-4 text-sm font-medium tracking-wide transition-colors ${activeTab==='results' ? 'text-purple-400' : 'text-gray-400 hover:text-gray-200'}`}>Results & Rankings</button>
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <div className="p-6">
            {activeTab==='overview' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-300">Your Tests</h2>
                  <Link to="/teacher/create-test" className="inline-flex items-center gap-2 rounded-md bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 text-sm font-medium transition-colors">
                    <Plus className="h-4 w-4" /> Create New Test
                  </Link>
                </div>
                {myTests.length===0 && (
                  <div className="text-center py-16">
                    <BarChart3 className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 mb-4 text-sm">No tests created yet.</p>
                    <Link to="/teacher/create-test" className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-5 py-2 rounded-md text-sm font-medium">
                      <Plus className="h-4 w-4" /> Create Your First Test
                    </Link>
                  </div>
                )}
                <div className="space-y-4">
                  {myTests.map(test => {
                    const stats = getTestStats(test.id);
                    const perTestResults = expandedTestId === test.id ? getPerTestResults(test.id) : [];
                    return (
                      <div key={test.id} className="rounded-md border border-white/10 bg-[#121212] p-5 transition-colors hover:bg-[#151515]">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-base font-medium text-white truncate">{test.title}</h3>
                              <button onClick={() => setExpandedTestId(expandedTestId===test.id?null:test.id)} className="text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-gray-300">
                                {expandedTestId===test.id ? 'Hide' : 'Details'}
                              </button>
                              <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${test.isActive? 'bg-emerald-500/10 text-emerald-400':'bg-gray-600/20 text-gray-300'}`}>{test.isActive? 'Active':'Inactive'}</span>
                            </div>
                            <p className="text-xs text-gray-400 mb-3 line-clamp-2">{test.description}</p>
                            <div className="flex flex-wrap gap-4 text-[11px] text-gray-500">
                              <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {test.duration} min</span>
                              <span>{new Date(test.startDate).toLocaleDateString()} – {new Date(test.endDate).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-3">
                            <div className="flex gap-2">
                              <Link to={`/teacher/edit-test/${test.id}`} className="px-2.5 py-1.5 text-[11px] rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 font-medium flex items-center gap-1"><Edit className="h-3 w-3" />Edit</Link>
                              <button onClick={() => handleToggleTestStatus(test.id, test.title, test.isActive)} className={`px-2.5 py-1.5 text-[11px] rounded font-medium flex items-center gap-1 ${test.isActive?'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20':'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'}`} disabled={pendingToggleId===test.id}>
                                {test.isActive ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                {test.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                              <button onClick={() => handleCopyLink(test.id)} className="px-2.5 py-1.5 text-[11px] rounded bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 font-medium flex items-center gap-1">
                                {copiedTestId===test.id ? <Copy className="h-3 w-3" /> : <Share2 className="h-3 w-3" />}
                                {copiedTestId===test.id ? 'Copied' : 'Share'}
                              </button>
                              <button onClick={() => handleDeleteTest(test.id, test.title)} className="px-2.5 py-1.5 text-[11px] rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 font-medium flex items-center gap-1" disabled={pendingDeleteId===test.id}>
                                <Trash2 className="h-3 w-3" />Del
                              </button>
                            </div>
                            <Link to={`/results/${test.id}`} className="text-[11px] font-medium text-gray-400 hover:text-gray-200">View Results →</Link>
                          </div>
                        </div>
                        {stats && (
                          <div className="grid grid-cols-4 gap-4 mt-5 text-center">
                            <div>
                              <p className="text-lg font-semibold text-indigo-400">{stats?.totalStudents}</p>
                              <p className="text-[10px] uppercase tracking-wide text-gray-500 mt-1">Students</p>
                            </div>
                            <div>
                              <p className="text-lg font-semibold text-emerald-400">{stats?.avgScore.toFixed(1)}%</p>
                              <p className="text-[10px] uppercase tracking-wide text-gray-500 mt-1">Avg</p>
                            </div>
                            <div>
                              <p className="text-lg font-semibold text-purple-400">{stats?.highestScore.toFixed(1)}%</p>
                              <p className="text-[10px] uppercase tracking-wide text-gray-500 mt-1">High</p>
                            </div>
                            <div>
                              <p className="text-lg font-semibold text-gray-300">{perTestResults.length}</p>
                              <p className="text-[10px] uppercase tracking-wide text-gray-500 mt-1">Subs</p>
                            </div>
                          </div>
                        )}
                        {expandedTestId===test.id && (
                          <div className="mt-6 border-t border-white/10 pt-4">
                            <h4 className="text-[11px] font-medium uppercase tracking-wide text-gray-400 mb-3">Per-Question Accuracy</h4>
                            {questionStatsLoading ? <div className="text-xs text-gray-500">Loading…</div> : (
                              <div className="space-y-2">
                                {(expandedQuestionStats||[]).map(qs => {
                                  const qObj = test.questions.find(q=>q.id===qs.questionId);
                                  return (
                                    <div key={qs.questionId} className="flex justify-between text-[11px] text-gray-400">
                                      <span className="truncate max-w-xs" title={qObj?.question}>{qObj?.question.slice(0,60)||'Question'}</span>
                                      <span className="text-gray-500 ml-4">{Math.round(qs.accuracy*100)}% ({qs.correct}/{qs.total})</span>
                                    </div>
                                  );
                                })}
                                {(!expandedQuestionStats||expandedQuestionStats.length===0) && <div className="text-[11px] text-gray-500">No submissions yet.</div>}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {activeTab==='results' && (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-300 mb-6">Student Rankings</h2>
                {allResults.length===0 && (
                  <div className="text-center py-16">
                    <Users className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 text-sm">No results yet.</p>
                  </div>
                )}
                <div className="space-y-3">
                  {allResults.sort((a,b)=>b.score-a.score).map((r,idx)=>{
                    const test = myTests.find(t=>t.id===r.testId);
                    return (
                      <div key={r.id} className="flex items-center justify-between rounded-md bg-white/5 hover:bg-white/10 transition-colors px-4 py-3">
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-white ${idx===0?'bg-yellow-500':'bg-gray-700'}`}>{idx+1}</div>
                          <div>
                            <p className="text-sm font-medium text-white">{r.studentName}</p>
                            <p className="text-[11px] text-gray-400">{test?.title}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-emerald-400">{r.score.toFixed(1)}%</p>
                          <p className="text-[10px] text-gray-500">{r.score.toFixed(0)}/{r.totalQuestions}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-lg border border-white/10 bg-[#0e0e0e] p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-300">Quick Actions</h2>
            <div className="text-[11px] text-gray-500">{myTests.filter(t=>t.isActive).length} active • {myTests.filter(t=>!t.isActive).length} inactive</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Link to="/teacher/create-test" className="relative rounded-md border border-dashed border-purple-500/40 bg-purple-500/5 hover:bg-purple-500/10 transition-colors p-6 group flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-full bg-purple-500/15 text-purple-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"><Plus className="h-5 w-5" /></div>
              <p className="text-sm font-medium text-purple-400">Create New Test</p>
              <p className="text-[11px] text-gray-500 mt-1">Start building a new quiz</p>
            </Link>
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-6 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-3"><Eye className="h-5 w-5" /></div>
              <p className="text-sm font-medium text-emerald-400">Active Tests</p>
              <p className="text-2xl font-semibold text-emerald-300 mt-2">{myTests.filter(t=>t.isActive).length}</p>
            </div>
            <div className="rounded-md border border-indigo-500/30 bg-indigo-500/5 p-6 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-full bg-indigo-500/15 text-indigo-400 flex items-center justify-center mb-3"><Users className="h-5 w-5" /></div>
              <p className="text-sm font-medium text-indigo-400">Total Responses</p>
              <p className="text-2xl font-semibold text-indigo-300 mt-2">{allResults.length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TeacherDashboard;