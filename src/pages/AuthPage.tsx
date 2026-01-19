import React, { useEffect } from 'react';
import { useParams, useLocation, Navigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { ModernAuthCard } from '../components/ModernAuthCard';
import { canonicalizeRole } from '../lib/roleUtils';

interface AuthPageProps {
  defaultMode?: 'signin' | 'signup';
}

const AuthPage: React.FC<AuthPageProps> = ({ defaultMode = 'signin' }) => {
  const { mode } = useParams<{ mode?: string }>();
  const location = useLocation();
  const { user, isLoaded } = useUser();

  // Keep the mode limited to signin|signup
  const resolvedMode = mode === 'signup' ? 'signup' : defaultMode === 'signup' ? 'signup' : 'signin';

  // Clean up Clerk query params embedded in the hash fragment
  useEffect(() => {
    if (!isLoaded) return;
    
    const cleanHashNow = () => {
      try {
        const h = window.location.hash || '';
        if (h.includes('?')) {
          const base = h.split('?')[0];
          window.history.replaceState(null, '', window.location.pathname + window.location.search + base);
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    };

    cleanHashNow();
  }, [isLoaded, user]);

  // If Clerk is still loading, show spinner
  if (!isLoaded) return <LoadingSpinner />;

  // If user is already signed in, redirect appropriately
  if (user) {
    const returnTo = (location.state as any)?.returnTo as string | undefined;
    const userRole = canonicalizeRole(user.unsafeMetadata?.role as string | undefined);
    
    if (returnTo) {
      return <Navigate to={returnTo} replace />;
    }
    if (userRole) {
      return <Navigate to={userRole === 'teacher' ? '/teacher' : '/student'} replace />;
    }
    return <Navigate to="/setup-role" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900">
      <ModernAuthCard mode={resolvedMode} />
    </div>
  );
};

export default AuthPage;
