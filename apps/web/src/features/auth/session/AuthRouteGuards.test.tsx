import type { SessionStatus } from '@nook/bridge-contracts';
import { render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AuthEntryRedirect,
  RedirectAuthenticated,
  RequireAuth,
} from '@/features/auth/session/AuthRouteGuards';

const session = vi.hoisted(() => ({ status: 'anonymous' as SessionStatus }));

vi.mock('@/features/auth/session/AuthSessionProvider', () => ({
  useAuthSession: () => ({ status: session.status }),
}));

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
}

function ProtectedProbe({ onRender }: { onRender: () => void }) {
  useEffect(onRender, [onRender]);
  return <p>보호 화면</p>;
}

function renderRoutes(initialPath: string, onProtectedRender = vi.fn()) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
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
            <RequireAuth>
              <ProtectedProbe onRender={onProtectedRender} />
            </RequireAuth>
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
  it('세션 복구 중에는 보호 화면을 렌더링하지 않는다', () => {
    session.status = 'bootstrapping';
    const onProtectedRender = vi.fn();

    renderRoutes('/map', onProtectedRender);

    expect(screen.queryByText('보호 화면')).not.toBeInTheDocument();
    expect(onProtectedRender).not.toHaveBeenCalled();
    expect(screen.getByTestId('location')).toHaveTextContent('/map');
  });

  it.each(['browser', 'webview'] as const)(
    '%s 익명 사용자는 보호 라우트에서 로그인으로 이동한다',
    (runtime) => {
      setRuntime(runtime);
      session.status = 'anonymous';

      renderRoutes('/map');

      expect(screen.getByText('로그인 화면')).toBeInTheDocument();
      expect(screen.getByTestId('location')).toHaveTextContent('/login');
    },
  );

  it('인증 사용자는 보호 라우트를 렌더링한다', () => {
    session.status = 'authenticated';

    renderRoutes('/map');

    expect(screen.getByText('보호 화면')).toBeInTheDocument();
  });

  it.each(['/', '/login'])('인증 사용자가 %s에 접근하면 기본 화면으로 이동한다', (path) => {
    session.status = 'authenticated';

    renderRoutes(path);

    expect(screen.getByText('보호 화면')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/map');
  });

  it('익명 사용자가 루트에 접근하면 로그인으로 이동한다', () => {
    session.status = 'anonymous';

    renderRoutes('/');

    expect(screen.getByText('로그인 화면')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/login');
  });
});
