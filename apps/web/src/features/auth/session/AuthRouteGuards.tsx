import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthSession } from '@/features/auth/session/AuthSessionProvider';
import { shouldShowOnboarding } from '@/features/onboarding/onboardingSeen';
import { nativeBridge } from '@/native-bridge';
import { env } from '@/shared/config/env';

const ENTRY_PATH = '/map';
const ONBOARDING_PATH = '/onboarding';

/**
 * 세션 판별이 끝날 때까지만 렌더를 미룬다.
 *
 * 게스트(anonymous)도 앱을 둘러볼 수 있어야 해서 여기서 로그인으로 돌려보내지 않는다 —
 * 계정이 필요한 동작은 화면마다 로그인 월(`useLoginGate`)이 막는다. 로그인 화면을 거쳐
 * 들어오든("둘러보기") 월에서 나갔다 돌아오든, 이 안쪽 화면들은 늘 열려 있다.
 */
export function AwaitSession({ children }: { children: ReactNode }) {
  const { status } = useAuthSession();

  if (status === 'bootstrapping') return null;
  return children;
}

/** 로그인한 사용자가 로그인 화면으로 오면 원래 있던 화면으로 되돌린다. */
export function RedirectAuthenticated({ children }: { children: ReactNode }) {
  const { status } = useAuthSession();
  const location = useLocation();

  if (status === 'bootstrapping') return null;
  if (status === 'authenticated') {
    // 방금 가입한 사람이 여기를 지난다 — 온보딩을 본 적 없으면 그쪽이 먼저다.
    if (shouldShowOnboarding()) return <Navigate to={ONBOARDING_PATH} replace />;
    // 로그인 월이 넘겨준 출발지로 돌아간다. 없으면(로그인 화면 직접 진입) 지도로.
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from ?? ENTRY_PATH} replace />;
  }
  return children;
}

/**
 * 루트(`/`) 진입. 게스트는 온보딩과 로그인 화면을 먼저 보고, 거기 "둘러보기" 로 앱에
 * 들어온다 — 앱이 무엇을 하는 물건인지 한 번은 보여주고 나서 선택하게 하려는 것이다.
 */
export function AuthEntryRedirect() {
  const { status } = useAuthSession();

  if (status === 'bootstrapping') return null;
  if (status !== 'authenticated') return <Navigate to="/login" replace />;
  // 로그인 직후 앱을 껐다 켠 경우에도 아직 안 본 온보딩은 여기서 걸린다.
  return <Navigate to={shouldShowOnboarding() ? ONBOARDING_PATH : ENTRY_PATH} replace />;
}

/**
 * `/onboarding` 직접 진입. 자동 진입과 같은 조건을 여기서도 확인한다 — 인증 상태와 실행 환경.
 * 브라우저는 자동 온보딩 대상이 아니라 직접 진입도 막는다. dev 에서만 시안 확인용으로 연다.
 */
export function RequireOnboarding({ children }: { children: ReactNode }) {
  const { status } = useAuthSession();

  if (status === 'bootstrapping') return null;
  if (status !== 'authenticated') return <Navigate to="/login" replace />;
  if (!nativeBridge.isNative && !env.enableDevRoutes) return <Navigate to={ENTRY_PATH} replace />;
  return children;
}
