import { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Navigate } from 'react-router-dom';
import { ModernAuthCard } from '../components/ModernAuthCard';

function LoginPage() {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [role, setRole] = useState<'teacher' | 'student'>('student');
  const { user } = useUser();

  // If user is already signed in, redirect to appropriate dashboard
  if (user) {
    const userRole = user.publicMetadata?.role as string;
    return <Navigate to={userRole === 'teacher' ? '/teacher' : '/student'} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <ModernAuthCard 
        defaultRole={role}
        mode={authMode}
        onRoleSelect={setRole}
        onModeChange={setAuthMode}
      />
    </div>
  );
}

export default LoginPage;
