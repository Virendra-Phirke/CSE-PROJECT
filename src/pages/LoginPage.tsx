import { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Navigate, useLocation } from 'react-router-dom';
import { ModernAuthCard } from '../components/ModernAuthCard';
import { canonicalizeRole } from '../lib/roleUtils';

function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<'teacher' | 'student'>('student');
  const { user, isLoaded } = useUser();
  const location = useLocation();
  
  // Get the return URL from location state
  const returnTo = location.state?.returnTo;

  // Wait for Clerk to load
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg-primary flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  // If user is already signed in, redirect to appropriate destination
  if (user) {
    const userRole = canonicalizeRole(user.unsafeMetadata?.role as string | undefined);
    if (userRole) {
      // If there's a return URL and user has a role, go there; otherwise go to dashboard
      if (returnTo) {
        return <Navigate to={returnTo} replace />;
      }
      return <Navigate to={userRole === 'teacher' ? '/teacher' : '/student'} replace />;
    } else {
      // Pass along the return URL to role setup
      return <Navigate to="/setup-role" state={{ returnTo }} replace />;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg-primary flex items-center justify-center px-4 py-8">
      <ModernAuthCard 
        defaultRole={role}
        mode={isLogin ? 'signin' : 'signup'}
        onRoleSelect={setRole}
        onModeChange={(mode) => setIsLogin(mode === 'signin')}
      />
    </div>
  );
}

export default LoginPage;
