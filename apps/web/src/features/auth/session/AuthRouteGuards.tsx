import type { ReactNode } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuthSession } from '@/features/auth/session/AuthSessionProvider';

const AUTHENTICATED_ENTRY_PATH = '/map';

/** 오픈 리다이렉트 방지 — 앱 내부 경로만 복귀 대상으로 인정한다. */
function toInternalPath(value: string | null): string | null {
  if (!value?.startsWith('/') || value.startsWith('//')) return null;
  return value;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuthSession();

  if (status === 'bootstrapping') return null;
  if (status === 'anonymous') return <Navigate to="/login" replace />;
  return children;
}

export function RedirectAuthenticated({ children }: { children: ReactNode }) {
  const { status } = useAuthSession();
  const [searchParams] = useSearchParams();

  if (status === 'bootstrapping') return null;
  if (status === 'authenticated') {
    // 공유 화면 등에서 로그인 유도로 들어온 경우 원래 보던 곳으로 돌려보낸다.
    const returnTo = toInternalPath(searchParams.get('returnTo'));
    return <Navigate to={returnTo ?? AUTHENTICATED_ENTRY_PATH} replace />;
  }
  return children;
}

export function AuthEntryRedirect() {
  const { status } = useAuthSession();

  if (status === 'bootstrapping') return null;
  return <Navigate to={status === 'authenticated' ? AUTHENTICATED_ENTRY_PATH : '/login'} replace />;
}
