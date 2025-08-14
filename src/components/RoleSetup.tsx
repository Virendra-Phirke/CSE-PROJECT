import { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { BookOpen, Users } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

function RoleSetup() {
  const [role, setRole] = useState<'teacher' | 'student'>('student');
  const [loading, setLoading] = useState(false);
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get the return URL from location state
  const returnTo = location.state?.returnTo;

  const handleRoleSubmit = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Update user metadata with selected role
      await user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          role: role
        }
      });
      
      // Navigate to return URL or appropriate dashboard
      if (returnTo) {
        navigate(returnTo, { replace: true });
      } else {
        const dashboardPath = role === 'teacher' ? '/teacher' : '/student';
        navigate(dashboardPath, { replace: true });
      }
    } catch (error) {
      console.error('Error setting role:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-gradient-to-r from-accent-purple-500 to-accent-red-500 p-3 rounded-full">
              <BookOpen className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold gradient-text">Choose Your Role</h2>
          <p className="mt-2 text-gray-600 dark:text-dark-text-secondary">
            Welcome {user?.firstName}! Please select your role to continue.
          </p>
        </div>

        {/* Theme Toggle */}
        {/* <div className="flex justify-center">
          <ThemeToggle />
        </div> */}

        {/* Role Selection */}
        <div className="card-elevated card-gradient p-8">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-8 text-center">
            I am a...
          </h3>
          
          <div className="grid grid-cols-1 gap-6 mb-8">
            <button
              onClick={() => setRole('student')}
              className={`role-button-student ${role === 'student' ? 'selected' : ''}`}
              aria-describedby="student-description"
            >
              <div className="flex items-center">
                <Users className={`h-10 w-10 mr-6 transition-colors duration-200 ${
                  role === 'student' ? 'icon-primary' : 'text-gray-500 dark:text-gray-400'
                }`} />
                <div className="text-left flex-1">
                  <p className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-1">Student</p>
                  <p id="student-description" className="text-sm text-gray-600 dark:text-dark-text-secondary">
                    Take tests, view results, and track your progress
                  </p>
                </div>
                {role === 'student' && (
                  <div className="ml-4">
                    <div className="w-6 h-6 bg-accent-purple-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </button>
            
            <button
              onClick={() => setRole('teacher')}
              className={`role-button-teacher ${role === 'teacher' ? 'selected' : ''}`}
              aria-describedby="teacher-description"
            >
              <div className="flex items-center">
                <BookOpen className={`h-10 w-10 mr-6 transition-colors duration-200 ${
                  role === 'teacher' ? 'icon-secondary' : 'text-gray-500 dark:text-gray-400'
                }`} />
                <div className="text-left flex-1">
                  <p className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-1">Teacher</p>
                  <p id="teacher-description" className="text-sm text-gray-600 dark:text-dark-text-secondary">
                    Create tests, manage students, and analyze performance
                  </p>
                </div>
                {role === 'teacher' && (
                  <div className="ml-4">
                    <div className="w-6 h-6 bg-accent-red-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </button>
          </div>

          <button
            onClick={handleRoleSubmit}
            disabled={loading || !role}
            className={`btn-primary w-full ${(!role || loading) ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-label={loading ? 'Setting up your role...' : 'Continue with selected role'}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Setting up...
              </div>
            ) : (
              'Continue'
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
            You can change your role later in your profile settings.
          </p>
        </div>
      </div>
    </div>
  );
}

export default RoleSetup;
