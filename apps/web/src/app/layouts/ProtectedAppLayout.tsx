import { useState } from 'react';
import { createPortal } from 'react-dom';
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
      {/* 셸의 will-change-transform 이 fixed 의 기준을 셸 박스로 바꿔서, 콘텐츠가
          뷰포트보다 길어지면 탭바가 셸 바닥(화면 밖)에 붙는다 — 문서 스크롤(#root) 중에도
          항상 화면 하단에 있어야 하니 body 로 포탈한다(ToastProvider 와 같은 이유). */}
      {createPortal(
        <BottomMenu items={bottomMenuItems} hidden={bottomMenuHidden} />,
        document.body,
      )}
    </BottomMenuVisibilityProvider>
  );
}
