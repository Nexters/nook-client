import * as React from 'react';
import { Drawer as DrawerPrimitive } from 'vaul';
import { useCloseOnBack } from '@/shared/lib/backInterceptors';
import { cn } from '@/shared/lib/utils';

/**
 * Radix 스타일의 vaul Drawer 를 우리 @theme 토큰으로 감싼 프리미티브 셋.
 * 바텀시트(지도 위 PlaceSheet 등)처럼 배경을 막지 않는(non-modal) 용도로 쓸 땐
 * `Drawer`에 `modal={false}`, `DrawerContent`에 `overlay={false}` 를 넘긴다.
 * 드래그·스냅·ARIA 는 전부 vaul 이 담당한다.
 */
function Drawer({
  open,
  onOpenChange,
  modal,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  // Android 백 버튼이 열린 시트를 닫는다(플랫폼 관례 — iOS 스와이프는 해당 없음).
  // 지도 위 비모달 시트는 상시 노출 패널이라 제외한다.
  const closeOnBack = React.useMemo(
    () => (modal === false || !onOpenChange ? null : () => onOpenChange(false)),
    [modal, onOpenChange],
  );
  useCloseOnBack(open, closeOnBack);

  return (
    <DrawerPrimitive.Root
      data-slot="drawer"
      open={open}
      onOpenChange={onOpenChange}
      modal={modal}
      {...props}
    />
  );
}

function DrawerTrigger(props: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerPortal(props: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />;
}

function DrawerClose(props: React.ComponentProps<typeof DrawerPrimitive.Close>) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

function DrawerOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
  return (
    <DrawerPrimitive.Overlay
      data-slot="drawer-overlay"
      className={cn('fixed inset-0 z-50 bg-gray-100/50', className)}
      {...props}
    />
  );
}

function DrawerContent({
  className,
  children,
  /** false 면 배경 딤 오버레이를 렌더하지 않는다 — 지도 위에 얹는 비모달 시트용. */
  overlay = true,
  /** 오버레이에 덧붙일 클래스 — 콘텐츠와 함께 z 를 올려야 할 때(탭바 위로 띄우기 등) 쓴다. */
  overlayClassName,
  /** false 면 기본 드래그핸들(80x4, gray-20)을 렌더하지 않는다. */
  showHandle = true,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content> & {
  overlay?: boolean;
  overlayClassName?: string;
  showHandle?: boolean;
}) {
  return (
    <DrawerPortal>
      {overlay && <DrawerOverlay className={overlayClassName} />}
      <DrawerPrimitive.Content
        data-slot="drawer-content"
        className={cn(
          // outline-none: Radix FocusScope 가 콘텐츠에 tabIndex=-1 을 달아 두는데,
          // 모바일 WebKit 은 탭만으로 이 요소에 포커스를 줘서 기본 포커스 링이
          // 드로어 전체에 그려진다 — 다이얼로그 컨테이너의 포커스 링은 제거한다.
          'group/drawer-content fixed inset-x-0 bottom-0 z-50 flex h-auto flex-col rounded-t-xl bg-gray-0 outline-none',
          className,
        )}
        {...props}
      >
        {showHandle && <div className="mx-auto my-3 h-1 w-20 shrink-0 rounded-full bg-gray-20" />}
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  );
}

function DrawerHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="drawer-header"
      className={cn('flex flex-col gap-1 p-4', className)}
      {...props}
    />
  );
}

function DrawerFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn('mt-auto flex flex-col gap-2 p-4', className)}
      {...props}
    />
  );
}

function DrawerTitle({ className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn('text-b1 font-medium text-gray-90', className)}
      {...props}
    />
  );
}

function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn('text-b2 text-gray-60', className)}
      {...props}
    />
  );
}

export {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
};
