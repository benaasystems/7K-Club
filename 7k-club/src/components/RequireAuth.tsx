import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';
import type { Role } from '../lib/types';
import { PageLoader } from './ui';

export function RequireAuth({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader />;
  if (!session) {
    return <Navigate to={`/signin?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }
  if (roles && (!profile || !roles.includes(profile.role))) return <Navigate to="/" replace />;
  return <>{children}</>;
}
