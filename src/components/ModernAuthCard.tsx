import React, { useState } from 'react';
import { SignIn, SignUp } from '@clerk/clerk-react';
import { Users, BookOpen } from 'lucide-react';

interface ModernAuthCardProps {
  onRoleSelect?: (role: 'student' | 'teacher') => void;
  defaultRole?: 'student' | 'teacher';
  mode?: 'signin' | 'signup';
  onModeChange?: (mode: 'signin' | 'signup') => void;
}

export const ModernAuthCard: React.FC<ModernAuthCardProps> = ({
  onRoleSelect,
  defaultRole = 'student',
  mode = 'signin',
  onModeChange
}) => {
  const [selectedRole, setSelectedRole] = useState<'student' | 'teacher'>(defaultRole);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>(mode);
  const [isFlipping, setIsFlipping] = useState(false);

  const handleRoleSelect = (role: 'student' | 'teacher') => {
    setSelectedRole(role);
    onRoleSelect?.(role);
  };

  const handleModeChange = (newMode: 'signin' | 'signup') => {
    if (newMode === authMode) return;
    
    setIsFlipping(true);
    setTimeout(() => {
      setAuthMode(newMode);
      onModeChange?.(newMode);
      setTimeout(() => setIsFlipping(false), 150);
    }, 150);
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 animate-gradient-shift"></div>
        <div className="floating-particles"></div>
      </div>

      {/* Logo */}
      <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-pink-500/30">
        📚
      </div>

      {/* Welcome Text */}
      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 text-center">
        <p className="text-gray-300 text-sm">
          {authMode === 'signin' ? 'Welcome back! Sign in to continue' : 'Create your account to get started'}
        </p>
      </div>

      {/* Main Card */}
      <div className="modern-auth-card relative">
        <div className={`card-flip-container ${isFlipping ? 'flipping' : ''}`}>
          <div className="card-flip-inner">
            {/* Role Selection */}
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-center mb-6 bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                Select Your Role
              </h2>
              
              <div className="flex gap-4 mb-6">
                <button
                  onClick={() => handleRoleSelect('student')}
                  className={`modern-role-option ${selectedRole === 'student' ? 'selected' : ''}`}
                >
                  <Users className={`h-8 w-8 mb-3 transition-colors duration-300 ${
                    selectedRole === 'student' ? 'text-purple-400' : 'text-gray-400'
                  }`} />
                  <div className="text-sm font-medium text-gray-200">Student</div>
                  {selectedRole === 'student' && (
                    <div className="absolute top-2 right-3 text-pink-400 font-bold">✓</div>
                  )}
                </button>
                
                <button
                  onClick={() => handleRoleSelect('teacher')}
                  className={`modern-role-option ${selectedRole === 'teacher' ? 'selected' : ''}`}
                >
                  <BookOpen className={`h-8 w-8 mb-3 transition-colors duration-300 ${
                    selectedRole === 'teacher' ? 'text-pink-400' : 'text-gray-400'
                  }`} />
                  <div className="text-sm font-medium text-gray-200">Teacher</div>
                  {selectedRole === 'teacher' && (
                    <div className="absolute top-2 right-3 text-pink-400 font-bold">✓</div>
                  )}
                </button>
              </div>

              {/* Mode Toggle Buttons */}
              <div className="flex gap-3 mb-8">
                <button
                  onClick={() => handleModeChange('signin')}
                  className={`modern-mode-btn ${authMode === 'signin' ? 'active' : 'inactive'}`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => handleModeChange('signup')}
                  className={`modern-mode-btn ${authMode === 'signup' ? 'active' : 'inactive'}`}
                >
                  Sign Up
                </button>
              </div>
            </div>

            {/* Auth Section */}
            <div className="auth-content">
              <h3 className="text-xl font-medium text-center mb-2 text-gray-100">
                {authMode === 'signin' ? 'Sign in to Quizmaster' : 'Create your Quizmaster account'}
              </h3>
              <p className="text-center text-gray-400 text-sm mb-6">
                {authMode === 'signin' 
                  ? 'Welcome back! Please sign in to continue' 
                  : 'Join thousands of learners and educators'
                }
              </p>

              {/* Clerk Auth Component */}
              <div className="clerk-container min-h-[300px] w-full">
                {authMode === 'signin' ? (
                  <SignIn
                    appearance={{
                      elements: {
                        rootBox: "w-full min-h-[250px]",
                        card: "bg-transparent shadow-none border-0 p-0 block w-full",
                        headerTitle: "hidden",
                        headerSubtitle: "hidden",
                        socialButtons: "flex flex-col gap-3 mb-6",
                        socialButtonsBlockButton: "modern-google-btn w-full py-3 px-4 bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600 rounded-lg transition-colors duration-200",
                        socialButtonsBlockButtonText: "text-gray-200 font-medium",
                        dividerLine: "bg-gray-600",
                        dividerText: "text-gray-400 text-sm",
                        formFieldLabel: "text-gray-300 text-sm font-medium mb-2 block",
                        formFieldInput: "modern-input-field w-full py-3 px-4 bg-gray-800 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-400 focus:border-pink-400 focus:ring-1 focus:ring-pink-400 transition-colors duration-200",
                        formButtonPrimary: "modern-continue-btn w-full py-3 px-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-medium rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all duration-200",
                        footerActionLink: "text-pink-400 hover:text-pink-300",
                        formResendCodeLink: "text-pink-400 hover:text-pink-300",
                        otherMethodsActionLink: "text-pink-400 hover:text-pink-300",
                        formFieldSuccessText: "text-green-400",
                        formFieldErrorText: "text-red-400",
                        identityPreviewText: "text-gray-300",
                        identityPreviewEditButton: "text-pink-400 hover:text-pink-300"
                      },
                      layout: {
                        showOptionalFields: false,
                        socialButtonsVariant: 'blockButton'
                      }
                    }}
                    fallbackRedirectUrl="/#/dashboard"
                    forceRedirectUrl="/#/dashboard"
                  />
                ) : (
                  <SignUp
                    appearance={{
                      elements: {
                        rootBox: "w-full min-h-[250px]",
                        card: "bg-transparent shadow-none border-0 p-0 block w-full",
                        headerTitle: "hidden",
                        headerSubtitle: "hidden",
                        socialButtons: "flex flex-col gap-3 mb-6",
                        socialButtonsBlockButton: "modern-google-btn w-full py-3 px-4 bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600 rounded-lg transition-colors duration-200",
                        socialButtonsBlockButtonText: "text-gray-200 font-medium",
                        dividerLine: "bg-gray-600",
                        dividerText: "text-gray-400 text-sm",
                        formFieldLabel: "text-gray-300 text-sm font-medium mb-2 block",
                        formFieldInput: "modern-input-field w-full py-3 px-4 bg-gray-800 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-400 focus:border-pink-400 focus:ring-1 focus:ring-pink-400 transition-colors duration-200",
                        formButtonPrimary: "modern-continue-btn w-full py-3 px-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-medium rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all duration-200",
                        footerActionLink: "text-pink-400 hover:text-pink-300",
                        formResendCodeLink: "text-pink-400 hover:text-pink-300",
                        otherMethodsActionLink: "text-pink-400 hover:text-pink-300",
                        formFieldSuccessText: "text-green-400",
                        formFieldErrorText: "text-red-400",
                        identityPreviewText: "text-gray-300",
                        identityPreviewEditButton: "text-pink-400 hover:text-pink-300"
                      },
                      layout: {
                        showOptionalFields: true,
                        socialButtonsVariant: 'blockButton'
                      }
                    }}
                    fallbackRedirectUrl="/#/dashboard"
                    forceRedirectUrl="/#/dashboard"
                  />
                )}
              </div>

              {/* Footer */}
              <div className="text-center mt-6 text-xs text-gray-500">
                Secured by{' '}
                <a href="https://clerk.com" className="text-pink-400 hover:text-pink-300">
                  Clerk
                </a>
                <br />
                <span className="text-pink-400">Development mode</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
