import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RequireAuth } from '@/features/auth/session/AuthRouteGuards';
import { AuthSessionProvider, useAuthSession } from '@/features/auth/session/AuthSessionProvider';

const holder = vi.hoisted(() => ({
  handler: undefined as ((message: { type: string }) => void) | undefined,
  refresher: undefined as (() => Promise<string | null>) | undefined,
  requestSession: vi.fn(),
  cancelQueries: vi.fn().mockResolvedValue(undefined),
  clearQueryCache: vi.fn(),
}));

vi.mock('@/native-bridge', () => ({
  nativeBridge: {
    isNative: true,
    requestSession: holder.requestSession,
    on: (handler: (message: { type: string }) => void) => {
      holder.handler = handler;
      return vi.fn();
    },
  },
}));

vi.mock('@/app/queryClient', () => ({
  queryClient: {
    cancelQueries: holder.cancelQueries,
    clear: holder.clearQueryCache,
  },
}));

vi.mock('@/shared/api/http', () => ({
  apiClient: {
    setAccessTokenProvider: vi.fn(),
    setSessionRefresher: (refresher?: () => Promise<string | null>) => {
      holder.refresher = refresher;
    },
  },
}));

function SessionProbe() {
  const session = useAuthSession();
  return <span>보호 화면: {session.status}</span>;
}

describe('AuthSessionProvider 네이티브 세션 만료', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    holder.handler = undefined;
    holder.refresher = undefined;
    holder.requestSession.mockResolvedValue({
      status: 'authenticated',
      accessToken: 'stored-access-token',
      revision: 1,
    });
  });

  it('refresh 결과가 anonymous이면 Query Cache를 비우고 익명 세션으로 전환한다', async () => {
    render(
      <AuthSessionProvider>
        <MemoryRouter initialEntries={['/map']}>
          <Routes>
            <Route
              path="/map"
              element={
                <RequireAuth>
                  <SessionProbe />
                </RequireAuth>
              }
            />
            <Route path="/login" element={<p>로그인 화면</p>} />
          </Routes>
        </MemoryRouter>
      </AuthSessionProvider>,
    );
    expect(await screen.findByText('보호 화면: authenticated')).toBeInTheDocument();
    await waitFor(() => expect(holder.refresher).toBeDefined());
    holder.requestSession.mockResolvedValueOnce({ status: 'anonymous' });

    let refreshedToken: string | null | undefined;
    await act(async () => {
      refreshedToken = await holder.refresher?.();
    });

    expect(refreshedToken).toBeNull();
    expect(holder.cancelQueries).toHaveBeenCalledOnce();
    expect(holder.clearQueryCache).toHaveBeenCalledOnce();
    expect(screen.getByText('로그인 화면')).toBeInTheDocument();
  });
});
