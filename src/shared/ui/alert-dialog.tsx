import { AlertDialog as AlertDialogPrimitive } from 'radix-ui';
import type * as React from 'react';
import { cn } from '@/shared/lib/utils';

/**
 * Radix AlertDialog 를 우리 @theme 토큰으로 감싼 프리미티브 셋.
 *
 * shadcn 기본 소스에서 존재하지 않는 토큰(bg-background/border/text-muted-foreground)과
 * 애니메이션 유틸(tw-animate) 참조를 걷어내고, 색/타이포는 gray-* 토큰만 사용한다.
 * 확인 버튼은 이 파일이 소유하지 않는다 — 사용처에서 AlertDialogAction/AlertDialogCancel에 Button을 asChild로
// 합성하고, 필요한 경우 ButtonGroup으로 두 액션의 레이아웃을 구성한다.(Popup 참고).
 *
 * 포커스 트랩·이전 포커스 복원·ESC·스크롤 잠금·ARIA 배선은 전부 Radix 가 담당한다.
 */
function AlertDialog(props: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />;
}

function AlertDialogTrigger(props: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
  return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />;
}

function AlertDialogPortal(props: React.ComponentProps<typeof AlertDialogPrimitive.Portal>) {
  return <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />;
}

function AlertDialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
  return (
    <AlertDialogPrimitive.Overlay
      data-slot="alert-dialog-overlay"
      className={cn('fixed inset-0 z-50 bg-gray-100/50', className)}
      {...props}
    />
  );
}

function AlertDialogContent({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        data-slot="alert-dialog-content"
        className={cn(
          'fixed left-1/2 top-1/2 z-50 grid w-full max-w-[calc(100%-2.5rem)]',
          '-translate-x-1/2 -translate-y-1/2 rounded-xl bg-gray-0 shadow-lg',
          className,
        )}
        {...props}
      />
    </AlertDialogPortal>
  );
}

function AlertDialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn('flex flex-col gap-2 text-center', className)}
      {...props}
    />
  );
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn('flex items-center gap-2', className)}
      {...props}
    />
  );
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn('text-b1 font-semibold text-gray-100', className)}
      {...props}
    />
  );
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn('text-b2 font-medium text-gray-70', className)}
      {...props}
    />
  );
}

/** 확인 액션. 스타일은 사용처에서 `asChild` 로 Button 을 합성해 입힌다. */
function AlertDialogAction(props: React.ComponentProps<typeof AlertDialogPrimitive.Action>) {
  return <AlertDialogPrimitive.Action data-slot="alert-dialog-action" {...props} />;
}

/** 취소 액션. 스타일은 사용처에서 `asChild` 로 Button 을 합성해 입힌다. */
function AlertDialogCancel(props: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
  return <AlertDialogPrimitive.Cancel data-slot="alert-dialog-cancel" {...props} />;
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
};
