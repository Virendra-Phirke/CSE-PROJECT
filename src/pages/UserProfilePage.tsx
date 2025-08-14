import { UserProfile } from '@clerk/clerk-react';
import { useTheme } from '../hooks/useTheme';

const UserProfilePage = () => {
  const { isDark } = useTheme();
  return (
    <div className={`min-h-screen pt-8 pb-20 px-4 sm:px-8 ${isDark ? 'bg-[radial-gradient(circle_at_20%_20%,rgba(120,40,200,0.35),transparent_60%),linear-gradient(135deg,#0f0f17,#161627_60%,#1d0f24)]' : 'bg-gray-50'} flex items-start justify-center`}>
      <div className="w-full max-w-6xl premium-clerk-full premium-clerk-wrapper">
        {/* Clerk default UserProfile inside premium wrapper (light keeps defaults) */}
        <UserProfile routing="path" path="/user" />
      </div>
    </div>
  );
};

export default UserProfilePage;
