import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthSessionProvider, useAuthSession } from '@/features/auth/session/AuthSessionProvider';

vi.mock('@/native-bridge', () => ({
  nativeBridge: { isNative: false },
}));

function SessionProbe() {
  const session = useAuthSession();
  return (
    <>
      <span>{session.status}</span>
      <span>{session.accessToken ?? '토큰 없음'}</span>
      <button type="button" onClick={() => void session.establish('new-access-token')}>
        로그인
      </button>
      <button type="button" onClick={() => void session.clear()}>
        로그아웃
      </button>
    </>
  );
}

function renderProvider() {
  return render(
    <AuthSessionProvider>
      <SessionProbe />
    </AuthSessionProvider>,
  );
}

describe('AuthSessionProvider 브라우저 개발 세션', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('localStorage에 저장된 Access Token으로 세션을 복구한다', () => {
    localStorage.setItem(
      'nook.dev.session.v1',
      JSON.stringify({ accessToken: 'stored-access-token' }),
    );

    renderProvider();

    expect(screen.getByText('authenticated')).toBeInTheDocument();
    expect(screen.getByText('stored-access-token')).toBeInTheDocument();
  });

  it('로그인과 로그아웃을 localStorage에 반영한다', async () => {
    renderProvider();

    await act(async () => screen.getByRole('button', { name: '로그인' }).click());
    expect(JSON.parse(localStorage.getItem('nook.dev.session.v1') ?? '{}')).toEqual({
      accessToken: 'new-access-token',
    });
    expect(screen.getByText('new-access-token')).toBeInTheDocument();

    await act(async () => screen.getByRole('button', { name: '로그아웃' }).click());
    expect(localStorage.getItem('nook.dev.session.v1')).toBeNull();
    expect(screen.getByText('토큰 없음')).toBeInTheDocument();
  });
});
