import { type ReactNode, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import nookLogo from '@/assets/logo/header_logo.svg';
import { env } from '@/shared/config/env';
import { cn } from '@/shared/lib/utils';
import { Header } from '@/shared/ui';

interface MainTabPageLayoutProps {
  children: ReactNode;
  variant?: 'gray' | 'transparent';
}

/** map/group/my 최상위 탭 화면이 공유하는 safe area와 로고 헤더 레이아웃. */
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

  return (
    <div
      className={cn(
        'relative h-dvh w-full overflow-hidden',
        !overlay && 'flex flex-col bg-gray-10',
      )}
      style={overlay ? undefined : { paddingTop: 'env(safe-area-inset-top)' }}
    >
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
          'z-10 shrink-0',
          overlay && 'pointer-events-none absolute inset-x-0 top-[env(safe-area-inset-top)]',
        )}
      />
      <div className={overlay ? 'h-full min-h-0' : 'min-h-0 flex-1'}>{children}</div>
    </div>
  );
}
