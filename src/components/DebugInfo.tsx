import { useUser } from '@clerk/clerk-react';
import { canonicalizeRole } from '../lib/roleUtils';

function DebugInfo() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return <div className="fixed top-4 right-4 bg-yellow-500 text-white p-2 rounded text-xs">Loading...</div>;
  }

  return (
    <div className="fixed top-4 right-4 bg-blue-500 text-white p-2 rounded text-xs max-w-xs">
      <div>User: {user ? 'Signed In' : 'Not Signed In'}</div>
      {user && (
        <>
          <div>Name: {user.firstName} {user.lastName}</div>
          <div>Role: {canonicalizeRole(user.unsafeMetadata?.role as string | undefined) || 'No Role'}</div>
          <div>ID: {user.id}</div>
        </>
      )}
      <div>Path: {window.location.pathname}</div>
    </div>
  );
}

export default DebugInfo;
