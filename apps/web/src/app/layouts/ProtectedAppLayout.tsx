import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { BottomMenuVisibilityProvider } from '@/app/bottom-menu-visibility';
import { bottomMenuItems } from '@/app/navigation';
import { BottomMenu } from '@/shared/ui';

export function ProtectedAppLayout() {
  const [bottomMenuHidden, setBottomMenuHidden] = useState(false);

  return (
    <BottomMenuVisibilityProvider
      value={{ hidden: bottomMenuHidden, setHidden: setBottomMenuHidden }}
    >
      <div className="min-h-dvh">
        <Outlet />
      </div>
      <BottomMenu items={bottomMenuItems} hidden={bottomMenuHidden} />
    </BottomMenuVisibilityProvider>
  );
}
