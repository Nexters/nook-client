import type { ReactNode } from 'react';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { BottomMenuVisibilityProvider } from '@/app/bottom-menu-visibility';
import { bottomMenuItems } from '@/app/navigation';
import { BottomMenu } from '@/shared/ui';

function AuthRouteBoundary({ children }: { children: ReactNode }) {
  // 전역 인증이 붙으면 여기서 세션 조회 후 로그인 라우트로 redirect 한다.
  return children;
}

export function ProtectedAppLayout() {
  const [bottomMenuHidden, setBottomMenuHidden] = useState(false);

  return (
    <AuthRouteBoundary>
      <BottomMenuVisibilityProvider
        value={{ hidden: bottomMenuHidden, setHidden: setBottomMenuHidden }}
      >
        <div className="min-h-dvh">
          <Outlet />
        </div>
        <BottomMenu items={bottomMenuItems} hidden={bottomMenuHidden} />
      </BottomMenuVisibilityProvider>
    </AuthRouteBoundary>
  );
}
