import type { ReactNode } from 'react';
import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { BottomMenuVisibilityProvider } from '@/app/bottom-menu-visibility';
import { bottomMenuItems } from '@/app/navigation';
import { useAuthSession } from '@/features/auth/session/AuthSessionProvider';
import { BottomMenu } from '@/shared/ui';

function AuthRouteBoundary({ children }: { children: ReactNode }) {
  const session = useAuthSession();
  if (session.status === 'bootstrapping') return null;
  if (session.status === 'anonymous' && window.ReactNativeWebView) {
    return <Navigate to="/login" replace />;
  }
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
