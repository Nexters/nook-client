import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LoginPage } from '@/features/auth/LoginPage';
import {
  SOCIAL_LOGIN_REQUEST_EVENT,
  type SocialLoginRequestDetail,
} from '@/features/auth/social-login';

describe('LoginPage', () => {
  it('온보딩과 소셜 로그인 버튼을 렌더한다', () => {
    render(<LoginPage />);

    expect(screen.getByRole('img', { name: 'nook' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /마음에 드는 장소를 발견했다면/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '카카오로 시작하기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apple로 시작하기' })).toBeInTheDocument();
  });

  it('인디케이터로 다음 온보딩을 보여준다', () => {
    render(<LoginPage />);

    fireEvent.click(screen.getByRole('button', { name: '2번째 온보딩 보기' }));

    expect(screen.getByRole('heading', { name: /게시물을 저장하고/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '3번째 온보딩 보기' }));

    expect(screen.getByRole('heading', { name: /그룹별로 장소를 모아/ })).toBeInTheDocument();
  });

  it('소셜 로그인 요청 이벤트를 전달한다', () => {
    const listener = vi.fn<(event: Event) => void>();
    window.addEventListener(SOCIAL_LOGIN_REQUEST_EVENT, listener);
    render(<LoginPage />);

    fireEvent.click(screen.getByRole('button', { name: '카카오로 시작하기' }));

    expect(listener).toHaveBeenCalledOnce();
    const event = listener.mock.calls[0]?.[0] as CustomEvent<SocialLoginRequestDetail>;
    expect(event.detail).toEqual({ provider: 'kakao' });
    window.removeEventListener(SOCIAL_LOGIN_REQUEST_EVENT, listener);
  });
});
