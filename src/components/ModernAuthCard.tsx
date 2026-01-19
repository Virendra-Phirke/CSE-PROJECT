import React, { useState } from 'react';
import { SignIn, SignUp } from '@clerk/clerk-react';
import { GraduationCap, Users } from 'lucide-react';

interface ModernAuthCardProps {
  mode?: 'signin' | 'signup';
}

/**
 * Auth card with role selection - users choose Teacher or Student before signing in.
 * Uses Clerk's appearance prop for consistent theming.
 */
export const ModernAuthCard: React.FC<ModernAuthCardProps> = ({ mode = 'signin' }) => {
  const [selectedRole, setSelectedRole] = useState<'teacher' | 'student' | null>(null);

  // If no role selected yet, show role selection screen
  if (!selectedRole) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl bg-slate-800 rounded-xl shadow-lg border border-slate-700 p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">
              Welcome to QuizMaster
            </h2>
            <p className="text-gray-400">
              Choose your role to {mode === 'signin' ? 'sign in' : 'create an account'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Teacher Option */}
            <button
              onClick={() => setSelectedRole('teacher')}
              className="group relative p-8 border-2 border-slate-700 rounded-xl hover:border-red-500 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              <div className="flex flex-col items-center space-y-4">
                <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <GraduationCap className="w-10 h-10 text-white" />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Teacher
                  </h3>
                  <p className="text-sm text-gray-400">
                    Create and manage tests, view student results and analytics
                  </p>
                </div>
              </div>
            </button>

            {/* Student Option */}
            <button
              onClick={() => setSelectedRole('student')}
              className="group relative p-8 border-2 border-slate-700 rounded-xl hover:border-purple-500 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              <div className="flex flex-col items-center space-y-4">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <Users className="w-10 h-10 text-white" />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Student
                  </h3>
                  <p className="text-sm text-gray-400">
                    Take tests, view your results and track your progress
                  </p>
                </div>
              </div>
            </button>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            You can change your role later in account settings
          </p>
        </div>
      </div>
    );
  }

  // Role selected - show Clerk auth form
  const roleColor = selectedRole === 'teacher' ? 'red' : 'purple';
  const roleColorHex = selectedRole === 'teacher' ? '#ef4444' : '#a855f7';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-slate-800 rounded-xl shadow-lg border border-slate-700 p-8">
        {/* Role indicator with back button */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setSelectedRole(null)}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            ← Change role
          </button>
          <div className={`px-4 py-2 ${selectedRole === 'teacher' ? 'bg-red-900/30 text-red-400' : 'bg-purple-900/30 text-purple-400'} rounded-full text-sm font-medium`}>
            {selectedRole === 'teacher' ? (
              <span className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                Teacher
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Student
              </span>
            )}
          </div>
        </div>

        <div className="mb-6 text-center">
          <h2 className="text-2xl font-semibold text-white">
            {mode === 'signin' ? `Sign in as ${selectedRole}` : `Create ${selectedRole} account`}
          </h2>
          <p className="text-sm text-gray-400 mt-2">
            Access your dashboard and tests
          </p>
        </div>
        
        <div className="mt-4">
          {mode === 'signin' ? (
            <SignIn 
              appearance={{
                variables: {
                  colorPrimary: roleColorHex,
                },
                elements: {
                  rootBox: 'w-full',
                  card: 'bg-transparent shadow-none p-0 w-full',
                  form: 'w-full',
                  formFieldInput: 'w-full bg-slate-700 text-white border-slate-600',
                  formButtonPrimary: `w-full bg-gradient-to-r from-${roleColor}-500 to-${roleColor}-600`,
                  footerActionLink: `text-${roleColor}-400 hover:text-${roleColor}-300`
                }
              }}
              redirectUrl="/#/student"
              signUpUrl="/#/auth/signup"
              unsafeMetadata={{ intendedRole: selectedRole }}
            />
          ) : (
            <SignUp 
              appearance={{
                variables: {
                  colorPrimary: roleColorHex,
                },
                elements: {
                  rootBox: 'w-full',
                  card: 'bg-transparent shadow-none p-0 w-full',
                  form: 'w-full',
                  formFieldInput: 'w-full bg-slate-700 text-white border-slate-600',
                  formButtonPrimary: `w-full bg-gradient-to-r from-${roleColor}-500 to-${roleColor}-600`,
                  footerActionLink: `text-${roleColor}-400 hover:text-${roleColor}-300`
                }
              }}
              redirectUrl="/#/setup-role"
              signInUrl="/#/auth/signin"
              unsafeMetadata={{ intendedRole: selectedRole }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
