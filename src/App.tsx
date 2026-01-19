import { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { useUser, SignedIn, UserButton, SignedOut } from '@clerk/clerk-react';
import { TestProvider } from './contexts/TestContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LoadingProvider } from './contexts/LoadingContext';
import { useToast } from './components/ui/Toast';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import TestCreation from './pages/TestCreation';
import EditTest from './pages/EditTest';
import TakeTest from './pages/TakeTest';
import TestResults from './pages/TestResults';
import AnalyticsPage from './pages/AnalyticsPage';
import ManageStudentsPage from './pages/ManageStudentsPage';
import QuestionBankPage from './pages/QuestionBankPage';
import LoadingSpinner from './components/LoadingSpinner';
import RoleSetup from './components/RoleSetup';
import ErrorBoundary from './components/ErrorBoundary';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UserProfilePage from './pages/UserProfilePage';
import { canonicalizeRole } from './lib/roleUtils';

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return <LoadingSpinner />;
  }

  // Get user role from Clerk user metadata (normalized)
  const userRole = canonicalizeRole(user?.unsafeMetadata?.role as string | undefined);

  return (
    <Routes>
      {/* User profile */}
  <Route path="/user" element={user ? <UserProfilePage /> : <Navigate to="/auth/signin" />} />
      
      {/* Legacy /login still supported - render auth page (signin) */}
      <Route path="/login" element={<AuthPage defaultMode="signin" />} />

      {/* New canonical auth routes */}
      <Route path="/auth" element={<Navigate to="/auth/signin" replace />} />
      <Route path="/auth/:mode" element={<AuthPage />} />
      
      {/* Add a route for role setup */}
      <Route 
        path="/setup-role" 
        element={
          user ? <RoleSetup /> : <Navigate to="/auth/signin" />
        } 
      />
      
      <Route 
        path="/teacher" 
        element={
          user ? (
            userRole === 'teacher' ? <TeacherDashboard /> : <Navigate to="/setup-role" />
          ) : (
            <Navigate to="/auth/signin" />
          )
        } 
      />
      <Route 
        path="/teacher/create-test" 
        element={
          user ? (
            userRole === 'teacher' ? <TestCreation /> : <Navigate to="/setup-role" />
          ) : (
            <Navigate to="/auth/signin" />
          )
        } 
      />
      <Route 
        path="/teacher/edit-test/:testId" 
        element={
          user ? (
            userRole === 'teacher' ? <EditTest /> : <Navigate to="/setup-role" />
          ) : (
            <Navigate to="/auth/signin" />
          )
        } 
      />
      <Route 
        path="/teacher/analytics" 
        element={
          user ? (
            userRole === 'teacher' ? <AnalyticsPage /> : <Navigate to="/setup-role" />
          ) : (
            <Navigate to="/auth/signin" />
          )
        } 
      />
      <Route 
        path="/teacher/students" 
        element={
          user ? (
            userRole === 'teacher' ? <ManageStudentsPage /> : <Navigate to="/setup-role" />
          ) : (
            <Navigate to="/auth/signin" />
          )
        } 
      />
      <Route 
        path="/teacher/question-bank" 
        element={
          user ? (
            userRole === 'teacher' ? <QuestionBankPage /> : <Navigate to="/setup-role" />
          ) : (
            <Navigate to="/auth/signin" />
          )
        } 
      />
      <Route 
        path="/student" 
        element={
          user ? (
            userRole === 'student' ? <StudentDashboard /> : <Navigate to="/setup-role" />
          ) : (
            <Navigate to="/auth/signin" />
          )
        } 
      />
      <Route 
        path="/test/:testId" 
        element={user ? <TakeTest /> : <Navigate to="/auth/signin" state={{ returnTo: window.location.pathname }} />}
      />
      <Route 
        path="/results/:testId" 
        element={
          user ? <TestResults /> : <Navigate to="/auth/signin" />
        } 
      />
      
      {/* Landing Page */}
      <Route 
        path="/" 
        element={<LandingPage />}
      />

      {/* Dashboard Routes */}
      <Route 
        path="/dashboard" 
        element={
          user ? (
            userRole === 'teacher' ? <Navigate to="/teacher" /> :
            userRole === 'student' ? <Navigate to="/student" /> :
            <Navigate to="/setup-role" />
          ) : (
            <Navigate to="/auth/signin" />
          )
        } 
      />
      
      {/* Catch-all route */}
      <Route 
        path="*" 
        element={<Navigate to="/" />} 
      />
    </Routes>
  );
}

function AppHeader() {
  const location = useLocation();
  const { user } = useUser();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 100);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const hide = location.pathname.startsWith('/teacher') || location.pathname.startsWith('/student');
  // Hide on dashboards
  if (hide) return null;

  // Determine dashboard route for CTA
  const role = canonicalizeRole(user?.unsafeMetadata?.role as string | undefined);
  const dashboardPath = role === 'teacher' ? '/teacher' : role === 'student' ? '/student' : '/setup-role';

  return (
    <header className={`fixed top-0 w-full z-50 transition-all duration-300 border-b border-white/10 ${scrolled ? 'backdrop-blur-xl bg-black/60 shadow-lg shadow-black/40' : 'backdrop-blur-lg bg-black/40'} `}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/" className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-600 bg-clip-text text-transparent drop-shadow">QuizMaster</a>
          <span className="hidden sm:inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-white/10 text-fuchsia-200 border border-white/10">Beta</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          <a href="/#home" className="text-gray-300 hover:text-pink-400 transition-colors relative group">Home<span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-pink-500 to-purple-600 transition-all group-hover:w-full"/></a>
          <a href="/#about" className="text-gray-300 hover:text-pink-400 transition-colors relative group">About<span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-pink-500 to-purple-600 transition-all group-hover:w-full"/></a>
          <a href="/#features" className="text-gray-300 hover:text-pink-400 transition-colors relative group">Features<span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-pink-500 to-purple-600 transition-all group-hover:w-full"/></a>
          <a href="/#contact" className="text-gray-300 hover:text-pink-400 transition-colors relative group">Contact<span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-pink-500 to-purple-600 transition-all group-hover:w-full"/></a>
        </nav>
        <div className="flex items-center gap-3 md:gap-4">
          <SignedIn>
            <Link 
              to={dashboardPath} 
              className="hidden sm:inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 md:px-6 py-2 md:py-2.5 rounded-xl font-semibold text-sm hover:shadow-lg hover:brightness-110 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="hidden md:inline">Dashboard</span>
            </Link>
            <div className="flex items-center">
              <UserButton 
                afterSignOutUrl="/#/" 
                appearance={{ 
                  elements: { 
                    userButtonBox: 'flex items-center',
                    userButtonTrigger: 'focus:shadow-none hover:opacity-80 transition-opacity',
                    avatarBox: 'w-10 h-10',
                    userButtonPopoverCard: 'bg-slate-800 border border-slate-700 shadow-2xl',
                    userButtonPopoverActions: 'bg-slate-800',
                    userButtonPopoverActionButton: 'text-gray-200 hover:bg-slate-700 transition-colors',
                    userButtonPopoverActionButtonText: 'text-gray-200',
                    userButtonPopoverFooter: 'bg-slate-900 border-t border-slate-700',
                    userPreview: 'bg-slate-800',
                    userPreviewMainIdentifier: 'text-white font-semibold',
                    userPreviewSecondaryIdentifier: 'text-gray-400'
                  } 
                }} 
              />
            </div>
          </SignedIn>
          <SignedOut>
            <a href="/#/auth/signin" className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:shadow-lg hover:brightness-110 transition-all">Get Started</a>
            <a href="/#/auth/signin" className="text-gray-300 hover:text-pink-400 transition-colors font-medium">Sign in</a>
          </SignedOut>
        </div>
      </div>
    </header>
  );
}

function App() {
  const { ToastContainer } = useToast();
  
  return (
    <ErrorBoundary>
      <Router>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <TestProvider>
              <LoadingProvider>
                <div className="min-h-screen bg-[#0f0f12] text-gray-100 transition-colors duration-300 selection:bg-pink-500/80 selection:text-white">
                  <ToastContainer />
                  <AppHeader />
                  <AppRoutes />
                </div>
              </LoadingProvider>
            </TestProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
