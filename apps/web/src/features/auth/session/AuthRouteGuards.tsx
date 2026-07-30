import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthSession } from '@/features/auth/session/AuthSessionProvider';

const AUTHENTICATED_ENTRY_PATH = '/map';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuthSession();

  if (status === 'bootstrapping') return null;
  if (status === 'anonymous') return <Navigate to="/login" replace />;
  return children;
}

export function RedirectAuthenticated({ children }: { children: ReactNode }) {
  const { status } = useAuthSession();

  if (status === 'bootstrapping') return null;
  if (status === 'authenticated') return <Navigate to={AUTHENTICATED_ENTRY_PATH} replace />;
  return children;
}

export function AuthEntryRedirect() {
  const { status } = useAuthSession();

  if (status === 'bootstrapping') return null;
  return <Navigate to={status === 'authenticated' ? AUTHENTICATED_ENTRY_PATH : '/login'} replace />;
}
