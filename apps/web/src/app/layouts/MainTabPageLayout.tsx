import { type ReactNode, useEffect, useLayoutEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PinnedHeaderLayout } from '@/app/layouts/PinnedHeaderLayout';
import nookLogo from '@/assets/logo/header_logo.svg';
import { env } from '@/shared/config/env';
import { cn } from '@/shared/lib/utils';
import { Header } from '@/shared/ui';

interface MainTabPageLayoutProps {
  children: ReactNode;
  variant?: 'gray' | 'transparent';
}

/** map/archive/my 최상위 탭 화면이 공유하는 safe area와 로고 헤더 레이아웃. */
export function MainTabPageLayout({ children, variant = 'gray' }: MainTabPageLayoutProps) {
  const overlay = variant === 'transparent';
  const navigate = useNavigate();
  const logoTapCount = useRef(0);
  const logoTapResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (logoTapResetTimer.current) clearTimeout(logoTapResetTimer.current);
    },
    [],
  );

  // 러버밴드로 콘텐츠가 당겨질 때 드러나는 영역은 body 배경이다(#root 는 투명).
  // 기본값은 gray-0(흰색, global.css)이라 회색 화면에서는 흰 띠가 어색하게 비친다 —
  // 이 레이아웃이 떠 있는 동안만 화면과 같은 회색으로 맞춘다.
  useLayoutEffect(() => {
    if (overlay) return undefined;
    const previous = document.body.style.backgroundColor;
    document.body.style.backgroundColor = 'var(--color-gray-10)';
    return () => {
      document.body.style.backgroundColor = previous;
    };
  }, [overlay]);

  const handleLogoTap = () => {
    if (logoTapResetTimer.current) clearTimeout(logoTapResetTimer.current);

    logoTapCount.current += 1;
    if (logoTapCount.current === 5) {
      logoTapCount.current = 0;
      navigate('/dev/ut');
      return;
    }

    logoTapResetTimer.current = setTimeout(() => {
      logoTapCount.current = 0;
    }, 2_000);
  };

  const logo = <img src={nookLogo} alt="nook" className="h-[32px] w-[84px]" />;

  const header = (
    <Header
      variant={variant}
      left={
        env.enableDevRoutes ? (
          <button
            type="button"
            aria-label="UT 테스트 도구 열기"
            className="pointer-events-auto flex h-11 items-center"
            onClick={handleLogoTap}
          >
            {logo}
          </button>
        ) : (
          logo
        )
      }
      className={cn(
        overlay && 'pointer-events-none absolute inset-x-0 top-[env(safe-area-inset-top)] z-10',
      )}
    />
  );

  // 지도(transparent)는 지도가 뷰포트를 채워야 해서 화면을 뷰포트 높이에 가둔다.
  if (overlay) {
    return (
      <div className="relative h-dvh w-full overflow-hidden">
        {header}
        <div className="h-full min-h-0">{children}</div>
      </div>
    );
  }

  // gray(아카이브·마이)는 상세 화면들과 같은 구조다 — 콘텐츠는 문서 흐름(#root 스크롤)에 두고
  // 헤더만 화면에 고정한다.
  return (
    <PinnedHeaderLayout header={header} background="gray">
      {children}
    </PinnedHeaderLayout>
  );
}
