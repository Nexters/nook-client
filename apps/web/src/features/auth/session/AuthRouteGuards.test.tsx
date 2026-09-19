import type { SessionStatus } from '@nook/bridge-contracts';
import { render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { type InitialEntry, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AuthEntryRedirect,
  AwaitSession,
  RedirectAuthenticated,
  RequireOnboarding,
} from '@/features/auth/session/AuthRouteGuards';

const session = vi.hoisted(() => ({ status: 'anonymous' as SessionStatus }));

vi.mock('@/features/auth/session/AuthSessionProvider', () => ({
  useIsAuthenticated: () => session.status === 'authenticated',
  useAuthSession: () => ({ status: session.status }),
}));

// vitest 는 import.meta.env.DEV 가 true 라 enableDevRoutes 가 켜진다 — 운영 동작을 기본으로 본다.
const envMock = vi.hoisted(() => ({ enableDevRoutes: false }));

vi.mock('@/shared/config/env', () => ({ env: envMock }));

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
}

function AppProbe({ onRender }: { onRender: () => void }) {
  useEffect(onRender, [onRender]);
  return <p>앱 화면</p>;
}

function renderRoutes(initialEntry: InitialEntry, onAppRender = vi.fn()) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <LocationProbe />
      <Routes>
        <Route path="/" element={<AuthEntryRedirect />} />
        <Route
          path="/login"
          element={
            <RedirectAuthenticated>
              <p>로그인 화면</p>
            </RedirectAuthenticated>
          }
        />
        <Route
          path="/map"
          element={
            <AwaitSession>
              <AppProbe onRender={onAppRender} />
            </AwaitSession>
          }
        />
        <Route
          path="/archive/3"
          element={
            <AwaitSession>
              <p>아카이브 상세</p>
            </AwaitSession>
          }
        />
        <Route
          path="/onboarding"
          element={
            <RequireOnboarding>
              <p>온보딩 화면</p>
            </RequireOnboarding>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

function setRuntime(runtime: 'browser' | 'webview') {
  Object.defineProperty(window, 'ReactNativeWebView', {
    configurable: true,
    value: runtime === 'webview' ? { postMessage: vi.fn() } : undefined,
  });
}

// 온보딩은 앱에서 가입 직후 1회만 뜬다. 이 파일의 기본값은 "앱으로 들어온 이미 본 사용자" 로,
// 온보딩 분기는 해당 테스트에서만 비워 준다.
beforeEach(() => {
  setRuntime('webview');
  localStorage.setItem('onboarding_guide_seen', 'true');
  envMock.enableDevRoutes = false;
});

afterEach(() => {
  localStorage.clear();
  Reflect.deleteProperty(window, 'ReactNativeWebView');
});

describe('인증 라우트 가드', () => {
  it('세션 복구 중에는 화면을 렌더링하지 않는다', () => {
    session.status = 'bootstrapping';
    const onAppRender = vi.fn();

    renderRoutes('/map', onAppRender);

    expect(screen.queryByText('앱 화면')).not.toBeInTheDocument();
    expect(onAppRender).not.toHaveBeenCalled();
    expect(screen.getByTestId('location')).toHaveTextContent('/map');
  });

  it.each(['browser', 'webview'] as const)('%s 게스트도 앱 화면을 그대로 볼 수 있다', (runtime) => {
    setRuntime(runtime);
    session.status = 'anonymous';

    renderRoutes('/map');

    // 로그인으로 돌려보내지 않는다 — 계정이 필요한 동작만 화면 안에서 로그인 월이 막는다.
    expect(screen.getByText('앱 화면')).toBeInTheDocument();
    expect(screen.queryByText('로그인 화면')).not.toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/map');
  });

  it('인증 사용자도 같은 화면을 렌더링한다', () => {
    session.status = 'authenticated';

    renderRoutes('/map');

    expect(screen.getByText('앱 화면')).toBeInTheDocument();
  });

  it('게스트가 루트에 접근하면 온보딩·로그인 화면을 먼저 본다', () => {
    session.status = 'anonymous';

    renderRoutes('/');

    expect(screen.getByText('로그인 화면')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/login');
  });

  it('인증 사용자가 루트에 접근하면 지도로 바로 간다', async () => {
    session.status = 'authenticated';

    renderRoutes('/');

    expect(await screen.findByText('앱 화면')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/map');
  });

  it('온보딩을 본 적 없는 인증 사용자는 루트에서 온보딩으로 간다', async () => {
    session.status = 'authenticated';
    localStorage.clear();

    renderRoutes('/');

    expect(await screen.findByText('온보딩 화면')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/onboarding');
  });

  it('인증 사용자가 로그인 화면에 접근하면 지도로 이동한다', async () => {
    session.status = 'authenticated';

    renderRoutes('/login');

    expect(await screen.findByText('앱 화면')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/map');
  });

  it('방금 가입한 사용자는 로그인 직후 온보딩을 먼저 본다', async () => {
    session.status = 'authenticated';
    localStorage.clear();

    renderRoutes({ pathname: '/login', state: { from: '/archive/3' } });

    expect(await screen.findByText('온보딩 화면')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/onboarding');
  });

  it('로그인 월을 거쳐 왔으면 로그인 후 원래 보던 화면으로 돌아간다', async () => {
    session.status = 'authenticated';

    renderRoutes({ pathname: '/login', state: { from: '/archive/3' } });

    expect(await screen.findByText('아카이브 상세')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/archive/3');
  });

  // 브라우저는 자동 온보딩 대상이 아니다 — 온보딩은 앱을 처음 쓰는 사람에게 쓰는 법을 보여준다.
  it('브라우저에서는 온보딩을 본 적이 없어도 기존 경로로 간다', () => {
    session.status = 'authenticated';
    setRuntime('browser');
    localStorage.clear();

    renderRoutes('/');

    expect(screen.getByText('앱 화면')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/map');
  });

  it('온보딩에 직접 들어와도 로그인하지 않았으면 로그인 화면으로 보낸다', () => {
    session.status = 'anonymous';

    renderRoutes('/onboarding');

    expect(screen.getByTestId('location')).toHaveTextContent('/login');
  });

  it('온보딩에 직접 들어와도 브라우저면 기존 경로로 보낸다', () => {
    session.status = 'authenticated';
    setRuntime('browser');

    renderRoutes('/onboarding');

    expect(screen.getByTestId('location')).toHaveTextContent('/map');
  });

  it('dev 에서는 브라우저에서도 시안 확인용으로 온보딩을 직접 열 수 있다', () => {
    session.status = 'authenticated';
    setRuntime('browser');
    envMock.enableDevRoutes = true;

    renderRoutes('/onboarding');

    expect(screen.getByText('온보딩 화면')).toBeInTheDocument();
  });
});
