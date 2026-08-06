import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from '@/features/auth/LoginPage';

const holder = vi.hoisted(() => ({
  platform: 'ios' as 'ios' | 'android' | 'web',
  signIn: vi.fn(),
  error: null as string | null,
}));

vi.mock('@/native-bridge', () => ({
  nativeBridge: {
    isNative: true,
    get platform() {
      return holder.platform;
    },
  },
}));

vi.mock('@/features/auth/useSocialLogin', () => ({
  useSocialLogin: () => ({
    signIn: holder.signIn,
    pendingProvider: null,
    error: holder.error,
  }),
}));

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    holder.platform = 'ios';
    holder.error = null;
    holder.signIn.mockClear();
  });

  it('온보딩과 소셜 로그인 버튼을 렌더한다', () => {
    renderLoginPage();

    expect(screen.getByRole('img', { name: 'nook' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /마음에 드는 장소를 발견했다면/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '카카오로 시작하기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apple로 시작하기' })).toBeInTheDocument();
  });

  it('인디케이터로 다음 온보딩을 보여준다', () => {
    renderLoginPage();

    fireEvent.click(screen.getByRole('button', { name: '2번째 온보딩 보기' }));

    expect(screen.getByRole('heading', { name: /게시물을 저장하고/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '3번째 온보딩 보기' }));

    expect(screen.getByRole('heading', { name: /그룹별로 장소를 모아/ })).toBeInTheDocument();
  });

  it.each([
    ['카카오로 시작하기', 'kakao'],
    ['Apple로 시작하기', 'apple'],
  ])('%s 버튼은 해당 provider 로그인을 시작한다', (label, provider) => {
    renderLoginPage();

    fireEvent.click(screen.getByRole('button', { name: label }));

    expect(holder.signIn).toHaveBeenCalledWith(provider);
  });

  it.each(['android', 'web'] as const)(
    'Apple 로그인은 iOS 가 아니면 노출하지 않는다: %s',
    (platform) => {
      holder.platform = platform;
      renderLoginPage();

      expect(screen.queryByRole('button', { name: 'Apple로 시작하기' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: '카카오로 시작하기' })).toBeInTheDocument();
    },
  );

  it('로그인 실패 메시지를 안내한다', () => {
    holder.error = '로그인하지 못했어요.';
    renderLoginPage();

    expect(screen.getByRole('alert')).toHaveTextContent('로그인하지 못했어요.');
  });

  it('development 테스트 세션 화면으로 이동한다', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dev/ut" element={<p>테스트 세션 화면</p>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: '테스트 토큰으로 로그인' }));

    expect(screen.getByText('테스트 세션 화면')).toBeInTheDocument();
  });
});
