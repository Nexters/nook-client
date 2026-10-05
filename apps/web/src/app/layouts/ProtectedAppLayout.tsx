import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Outlet } from 'react-router-dom';
import { BottomMenuVisibilityProvider } from '@/app/bottom-menu-visibility';
import { markTabRootNavigation } from '@/app/layouts/MainTabPageLayout';
import { bottomMenuItems } from '@/app/navigation';
import { ArchiveJumpHost } from '@/features/post/components/ArchiveJumpPopover';
import { BOTTOM_INSET_VAR, BOTTOM_MENU_HEIGHT, BottomMenu } from '@/shared/ui';

export function ProtectedAppLayout() {
  const [bottomMenuHidden, setBottomMenuHidden] = useState(false);

  // 하단에 떠 있는 요소(토스트)가 탭바를 비켜 앉도록 지금 가려진 높이를 :root 에 심는다.
  // 컨텍스트 대신 CSS 변수인 이유: 토스트는 shared 레이어라 app 의 탭바 상태를 몰라야 한다.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty(
      BOTTOM_INSET_VAR,
      bottomMenuHidden ? 'env(safe-area-inset-bottom)' : BOTTOM_MENU_HEIGHT,
    );
    return () => {
      root.style.removeProperty(BOTTOM_INSET_VAR);
    };
  }, [bottomMenuHidden]);

  return (
    <BottomMenuVisibilityProvider
      value={{ hidden: bottomMenuHidden, setHidden: setBottomMenuHidden }}
    >
      <div className="min-h-dvh">
        <Outlet />
      </div>
      {/* 게시물 이동·삭제 실행취소 뒤 "보러가기"가 여는 아카이브 목록 — 띄운 화면이 닫힌 뒤에도 뜬다. */}
      <ArchiveJumpHost />
      {/* 셸의 will-change-transform 이 fixed 의 기준을 셸 박스로 바꿔서, 콘텐츠가
          뷰포트보다 길어지면 탭바가 셸 바닥(화면 밖)에 붙는다 — 문서 스크롤(#root) 중에도
          항상 화면 하단에 있어야 하니 body 로 포탈한다(ToastProvider 와 같은 이유). */}
      {createPortal(
        <BottomMenu
          items={bottomMenuItems}
          hidden={bottomMenuHidden}
          onNavigate={markTabRootNavigation}
        />,
        document.body,
      )}
    </BottomMenuVisibilityProvider>
  );
}
