import type { SessionStatus } from '@nook/bridge-contracts';
import { render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { type InitialEntry, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AuthEntryRedirect,
  AwaitSession,
  RedirectAuthenticated,
} from '@/features/auth/session/AuthRouteGuards';

const session = vi.hoisted(() => ({ status: 'anonymous' as SessionStatus }));

vi.mock('@/features/auth/session/AuthSessionProvider', () => ({
  useIsAuthenticated: () => session.status === 'authenticated',
  useAuthSession: () => ({ status: session.status }),
}));

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

afterEach(() => {
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

  it.each(['anonymous', 'authenticated'] as const)(
    '%s 사용자가 루트에 접근하면 지도로 이동한다',
    (status) => {
      session.status = status;

      renderRoutes('/');

      expect(screen.getByText('앱 화면')).toBeInTheDocument();
      expect(screen.getByTestId('location')).toHaveTextContent('/map');
    },
  );

  it('인증 사용자가 로그인 화면에 접근하면 지도로 이동한다', () => {
    session.status = 'authenticated';

    renderRoutes('/login');

    expect(screen.getByText('앱 화면')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/map');
  });

  it('로그인 월을 거쳐 왔으면 로그인 후 원래 보던 화면으로 돌아간다', () => {
    session.status = 'authenticated';

    renderRoutes({ pathname: '/login', state: { from: '/archive/3' } });

    expect(screen.getByText('아카이브 상세')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/archive/3');
  });
});
