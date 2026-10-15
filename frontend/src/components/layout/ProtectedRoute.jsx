import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

/**
 * Route guard: redirects unauthenticated users to /login, and - when
 * `roles` is supplied - redirects authenticated users who lack the
 * required role to /dashboard. This is a UX convenience only; the real
 * authorization boundary is the backend's RBAC middleware, which every
 * endpoint enforces independently of what the client shows.
 */
export default function ProtectedRoute({ roles }) {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);

  if (!accessToken || !user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
