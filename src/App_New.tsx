import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, useUser } from '@clerk/clerk-react';
import { canonicalizeRole } from './lib/roleUtils';
import { TestProvider } from './contexts/TestContext';
import { ThemeProvider } from './contexts/ThemeContext';
import LoginPage from './pages/LoginPage';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import TestCreation from './pages/TestCreation';
import TakeTest from './pages/TakeTest';
import TestResults from './pages/TestResults';
import LoadingSpinner from './components/LoadingSpinner';
import RoleSetup from './components/RoleSetup';

function AppRoutes() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return <LoadingSpinner />;
  }

  // Get user role from Clerk user metadata (normalized)
  const userRole = canonicalizeRole(user?.unsafeMetadata?.role as string | undefined);

  // Debug: Log user info
  console.log('User:', user);
  console.log('User Role:', userRole);
  console.log('Is Loaded:', isLoaded);

  return (
    <Routes>
      <Route 
        path="/login" 
        element={
          <SignedOut>
            <LoginPage />
          </SignedOut>
        } 
      />
      
      {/* Add a route for role setup */}
      <Route 
        path="/setup-role" 
        element={
          <SignedIn>
            <RoleSetup />
          </SignedIn>
        } 
      />
      
      <Route 
        path="/teacher" 
        element={
          <SignedIn>
            {userRole === 'teacher' ? <TeacherDashboard /> : <Navigate to="/setup-role" />}
          </SignedIn>
        } 
      />
      <Route 
        path="/teacher/create-test" 
        element={
          <SignedIn>
            {userRole === 'teacher' ? <TestCreation /> : <Navigate to="/setup-role" />}
          </SignedIn>
        } 
      />
      <Route 
        path="/student" 
        element={
          <SignedIn>
            {userRole === 'student' ? <StudentDashboard /> : <Navigate to="/setup-role" />}
          </SignedIn>
        } 
      />
      <Route 
        path="/test/:testId" 
        element={
          <SignedIn>
            {userRole === 'student' ? <TakeTest /> : <Navigate to="/setup-role" />}
          </SignedIn>
        } 
      />
      <Route 
        path="/results/:testId" 
        element={
          <SignedIn>
            <TestResults />
          </SignedIn>
        } 
      />
      
      {/* Default route logic */}
      <Route 
        path="/" 
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
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <ThemeProvider>
        <TestProvider>
          <div className="min-h-screen gradient-bg">
            <AppRoutes />
          </div>
        </TestProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
