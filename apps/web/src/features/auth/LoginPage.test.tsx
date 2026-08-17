import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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

// 온보딩 JSON 은 장당 수 MB 라 테스트에서 실제로 파싱하면 느려지기만 한다.
// 여기서 검증할 건 문구·전환·버튼 배선이지 애니메이션 재생이 아니다.
vi.mock('@/shared/ui/lottie', () => ({ Lottie: () => null }));
vi.mock('@/assets/lottie/onboarding_1.json', () => ({ default: {} }));
vi.mock('@/assets/lottie/onboarding_2.json', () => ({ default: {} }));
vi.mock('@/assets/lottie/onboarding_3.json', () => ({ default: {} }));

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

    expect(screen.getByRole('heading', { name: '발견한 장소를 누크에 쏙!' })).toBeInTheDocument();
    expect(screen.getByText(/인스타그램에서 마음에 드는 장소를 발견하고/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '카카오로 로그인' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apple로 로그인' })).toBeInTheDocument();
  });

  it('인디케이터로 다음 온보딩을 보여준다', () => {
    renderLoginPage();

    fireEvent.click(screen.getByRole('button', { name: '2번째 온보딩 보기' }));
    expect(screen.getByRole('button', { name: '2번째 온보딩 보기' })).toHaveAttribute(
      'aria-current',
      'true',
    );

    fireEvent.click(screen.getByRole('button', { name: '3번째 온보딩 보기' }));
    expect(screen.getByRole('button', { name: '3번째 온보딩 보기' })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  it('세 장의 문구를 모두 렌더하되 비활성 장은 접근성 트리에서 감춘다', () => {
    renderLoginPage();

    // 캐러셀은 translateX 로 넘기므로 비활성 장도 DOM 에는 남아 있다.
    expect(screen.getByText('게시물 속 장소를 지도에!')).toBeInTheDocument();
    expect(screen.getByText('나만의 아카이브를 만들어요')).toBeInTheDocument();
    // 다만 aria-hidden 이라 스크린 리더에는 현재 장만 읽힌다.
    expect(
      screen.queryByRole('heading', { name: '게시물 속 장소를 지도에!' }),
    ).not.toBeInTheDocument();
  });

  it.each([
    ['카카오로 로그인', 'kakao'],
    ['Apple로 로그인', 'apple'],
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

      expect(screen.queryByRole('button', { name: 'Apple로 로그인' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: '카카오로 로그인' })).toBeInTheDocument();
    },
  );

  it('로그인 실패 메시지를 안내한다', () => {
    holder.error = '로그인하지 못했어요.';
    renderLoginPage();

    expect(screen.getByRole('alert')).toHaveTextContent('로그인하지 못했어요.');
  });

  it('테스트 토큰 로그인 진입점을 노출하지 않는다', () => {
    renderLoginPage();

    expect(screen.queryByRole('button', { name: /테스트 토큰/ })).not.toBeInTheDocument();
  });

  it('동의 문구와 약관·개인정보처리방침 링크를 노출한다', () => {
    renderLoginPage();

    const terms = screen.getByRole('link', { name: '이용약관' });
    expect(terms).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: '개인정보처리방침' })).toHaveAttribute(
      'href',
      '/privacy',
    );

    // getByText 는 직접 자식 텍스트 노드만 보므로 링크 안의 글자가 빠진다 —
    // 문단을 잡아 textContent 로 문구 전체를 확인한다.
    expect(terms.closest('p')).toHaveTextContent(
      '계속하면 이용약관과 개인정보처리방침에 동의하게 됩니다.',
    );
  });
});
