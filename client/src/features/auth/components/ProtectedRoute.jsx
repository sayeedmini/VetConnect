import { Navigate, useLocation } from 'react-router-dom';
import { useAuthSession } from '../context/AuthSessionContext';

function ProtectedRoute({ children, allowedRoles = [] }) {
  const { isLoggedIn: loggedIn, isReady, user } = useAuthSession();
  const location = useLocation();
  const from = `${location.pathname}${location.search}${location.hash}`;

  if (!isReady) {
    return (
      <div className="min-h-screen bg-[#F7F9FB] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-[28px] border border-slate-200 bg-white p-8 text-center text-slate-600 shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
          Restoring your session...
        </div>
      </div>
    );
  }

  if (!loggedIn) {
    return <Navigate to="/login" replace state={{ from }} />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;
