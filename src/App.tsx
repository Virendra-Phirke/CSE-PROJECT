import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useUser, SignedIn, UserButton, SignInButton, SignedOut } from '@clerk/clerk-react';
import { TestProvider } from './contexts/TestContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LoadingProvider } from './contexts/LoadingContext';
import { useToast } from './components/ui/Toast';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import TestCreation from './pages/TestCreation';
import EditTest from './pages/EditTest';
import TakeTest from './pages/TakeTest';
import TestResults from './pages/TestResults';
import LoadingSpinner from './components/LoadingSpinner';
import RoleSetup from './components/RoleSetup';
import ErrorBoundary from './components/ErrorBoundary';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UserProfilePage from './pages/UserProfilePage';

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return <LoadingSpinner />;
  }

  // Get user role from Clerk user metadata
  const userRole = user?.unsafeMetadata?.role as string;

  return (
    <Routes>
      {/* User profile */}
      <Route path="/user" element={user ? <UserProfilePage /> : <Navigate to="/login" />} />
      
      <Route 
        path="/login" 
        element={
          user ? <Navigate to="/" /> : <LoginPage />
        } 
      />
      
      {/* Add a route for role setup */}
      <Route 
        path="/setup-role" 
        element={
          user ? <RoleSetup /> : <Navigate to="/login" />
        } 
      />
      
      <Route 
        path="/teacher" 
        element={
          user ? (
            userRole === 'teacher' ? <TeacherDashboard /> : <Navigate to="/setup-role" />
          ) : (
            <Navigate to="/login" />
          )
        } 
      />
      <Route 
        path="/teacher/create-test" 
        element={
          user ? (
            userRole === 'teacher' ? <TestCreation /> : <Navigate to="/setup-role" />
          ) : (
            <Navigate to="/login" />
          )
        } 
      />
      <Route 
        path="/teacher/edit-test/:testId" 
        element={
          user ? (
            userRole === 'teacher' ? <EditTest /> : <Navigate to="/setup-role" />
          ) : (
            <Navigate to="/login" />
          )
        } 
      />
      <Route 
        path="/student" 
        element={
          user ? (
            userRole === 'student' ? <StudentDashboard /> : <Navigate to="/setup-role" />
          ) : (
            <Navigate to="/login" />
          )
        } 
      />
      <Route 
        path="/test/:testId" 
        element={user ? <TakeTest /> : <Navigate to="/login" state={{ returnTo: window.location.pathname }} />}
      />
      <Route 
        path="/results/:testId" 
        element={
          user ? <TestResults /> : <Navigate to="/login" />
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
            <Navigate to="/login" />
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
  const role = user?.unsafeMetadata?.role as string | undefined;
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
        <div className="flex items-center gap-4">
          <SignedIn>
            <a href={dashboardPath} className="hidden sm:inline-block bg-gradient-to-r from-pink-500 to-purple-600 text-white px-5 py-2 rounded-full font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all">Go to Dashboard</a>
            <UserButton afterSignOutUrl="/" appearance={{ elements: { userButtonPopoverCard: 'bg-[#111827] border border-white/10 backdrop-blur-xl' } }} />
          </SignedIn>
          <SignedOut>
            <a href="/login" className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-2 rounded-full font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all">Get Started</a>
            <SignInButton />
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
                <div className="min-h-screen bg-mesh-premium bg-[length:160%_160%] animate-gradient-shift dark:bg-[#0f0f12] text-gray-900 dark:text-gray-100 transition-colors duration-300 selection:bg-pink-500/80 selection:text-white">
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
