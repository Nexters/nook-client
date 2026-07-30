import type { ReactNode } from 'react';
import nookLogo from '@/assets/logo/Vector.svg';
import { cn } from '@/shared/lib/utils';
import { Header } from '@/shared/ui';

interface MainTabPageLayoutProps {
  children: ReactNode;
  variant?: 'gray' | 'transparent';
}

/** map/group/my 최상위 탭 화면이 공유하는 safe area와 로고 헤더 레이아웃. */
export function MainTabPageLayout({ children, variant = 'gray' }: MainTabPageLayoutProps) {
  const overlay = variant === 'transparent';

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
        left={<img src={nookLogo} alt="nook" className="h-[22px] w-[50px]" />}
        className={cn(
          'z-10 shrink-0',
          overlay && 'pointer-events-none absolute inset-x-0 top-[env(safe-area-inset-top)]',
        )}
      />
      <div className={overlay ? 'h-full min-h-0' : 'min-h-0 flex-1'}>{children}</div>
    </div>
  );
}
