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
import TestDetailPage from './pages/TestDetailPage';
import AllReviewsPage from './pages/AllReviewsPage';
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
      
      {/* All Reviews Page - Public */}
      <Route path="/reviews" element={<AllReviewsPage />} />
      
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
        path="/teacher/test/:testId" 
        element={
          user ? (
            userRole === 'teacher' ? <TestDetailPage /> : <Navigate to="/setup-role" />
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
          <Link to="/" className="quizmaster-button relative text-3xl font-extrabold tracking-wider cursor-pointer">
            <span className="actual-text text-transparent" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.6)' }}>&nbsp;QuizMaster&nbsp;</span>
            <span aria-hidden="true" className="hover-text absolute inset-0 overflow-hidden transition-all duration-500" style={{ 
              width: '0%', 
              color: '#FF3737', 
              WebkitTextStroke: '1px #FF3737',
              borderRight: '6px solid #FF3737'
            }}>&nbsp;QuizMaster&nbsp;</span>
          </Link>
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
              className="group/button relative hidden sm:inline-flex items-center justify-center overflow-hidden rounded-md bg-gray-800/30 backdrop-blur-lg px-6 py-2 text-base font-semibold text-white transition-all duration-300 ease-in-out hover:scale-110 hover:shadow-xl hover:shadow-gray-600/50 border border-white/20"
            >
              <span className="flex items-center gap-2 text-base">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Dashboard
              </span>
              <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-13deg)_translateX(-100%)] group-hover/button:duration-1000 group-hover/button:[transform:skew(-13deg)_translateX(100%)]">
                <div className="relative h-full w-10 bg-white/20"></div>
              </div>
            </Link>
            <UserButton 
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  userButtonPopoverCard: 'bg-white shadow-xl',
                  userButtonPopoverActionButton: 'hover:bg-gray-100',
                  userButtonPopoverActionButtonText: 'text-gray-700',
                  userButtonPopoverFooter: 'bg-white border-t border-gray-200',
                  userPreviewMainIdentifier: 'text-gray-900',
                  userPreviewSecondaryIdentifier: 'text-gray-600'
                }
              }}
            />
          </SignedIn>
          <SignedOut>
            <Link 
              to="/auth/signin" 
              className="relative cursor-pointer py-2 px-6 text-center inline-flex justify-center text-sm uppercase text-white rounded-lg transition-transform duration-300 ease-in-out group outline-offset-4 focus:outline focus:outline-2 focus:outline-white focus:outline-offset-4 overflow-hidden"
            >
              <span className="relative z-20">Sign In</span>

              <span className="absolute left-[-75%] top-0 h-full w-[50%] bg-white/20 rotate-12 z-10 blur-lg group-hover:left-[125%] transition-all duration-1000 ease-in-out"></span>

              <span className="w-1/2 transition-all duration-300 block border-pink-400 absolute h-[20%] rounded-tl-lg border-l-2 border-t-2 top-0 left-0"></span>
              <span className="w-1/2 transition-all duration-300 block border-pink-400 absolute group-hover:h-[90%] h-[60%] rounded-tr-lg border-r-2 border-t-2 top-0 right-0"></span>
              <span className="w-1/2 transition-all duration-300 block border-pink-400 absolute h-[60%] group-hover:h-[90%] rounded-bl-lg border-l-2 border-b-2 left-0 bottom-0"></span>
              <span className="w-1/2 transition-all duration-300 block border-pink-400 absolute h-[20%] rounded-br-lg border-r-2 border-b-2 right-0 bottom-0"></span>
            </Link>
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
