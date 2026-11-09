import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/*
 * For screens that only make sense without a session (login, register, forgot
 * password): if the user is already logged in, send them to the dashboard
 * instead of showing the form again.
 */
export default function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#08090D]">
        <div className="animate-spin h-10 w-10 border-4 border-lime-400 border-t-transparent rounded-full" />
      </div>
    );

  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}
