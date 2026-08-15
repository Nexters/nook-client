import { AlertDialog as AlertDialogPrimitive } from 'radix-ui';
import type * as React from 'react';
import { cn } from '@/shared/lib/utils';

/**
 * Radix AlertDialog 를 우리 @theme 토큰으로 감싼 프리미티브 셋.
 * 확인 버튼은 이 파일이 소유하지 않는다 — 사용처에서 Action/Cancel 에 Button 을
 * asChild 로 합성하고, 필요하면 ButtonGroup 으로 배치한다(Popup 참고).
 * 포커스 트랩·이전 포커스 복원·ESC·스크롤 잠금·ARIA 는 전부 Radix 가 담당한다.
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
      // z-70: 탭바(60) 위에 딤이 덮여야 한다 — 아니면 모달 위로 탭바가 남는다.
      className={cn('fixed inset-0 z-[70] bg-gray-100/50', className)}
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
          'fixed left-1/2 top-1/2 z-[70] grid w-full max-w-[calc(100%-2.5rem)]',
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
