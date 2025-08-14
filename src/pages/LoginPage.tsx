import { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Navigate, useLocation } from 'react-router-dom';
import { ModernAuthCard } from '../components/ModernAuthCard';

function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<'teacher' | 'student'>('student');
  const { user } = useUser();
  const location = useLocation();
  
  // Get the return URL from location state
  const returnTo = location.state?.returnTo;

  // If user is already signed in, redirect to appropriate destination
  if (user) {
    const userRole = user.unsafeMetadata?.role as string;
    if (userRole) {
      // If there's a return URL and user has a role, go there; otherwise go to dashboard
      if (returnTo) {
        return <Navigate to={returnTo} replace />;
      }
      return <Navigate to="/dashboard" />;
    } else {
      // Pass along the return URL to role setup
      return <Navigate to="/setup-role" state={{ returnTo }} />;
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
