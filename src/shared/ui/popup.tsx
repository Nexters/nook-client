import type * as React from 'react';
import { cn } from '@/shared/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from './alert-dialog';
import { Button } from './button';
import { ButtonGroup } from './button-group';

/**
 * Figma `Tabloid - 4 > Popup` 기준 확인 다이얼로그.
 * Radix AlertDialog(→ alert-dialog.tsx) 위에 올린 얇은 편의 래퍼다.
 *
 * 계측값(Figma):
 * - 카드 280(w-70), radius 12(rounded-xl), fill gray-0
 * - 본문 padding-top 32 / 좌우 32, 제목 B1 SemiBold gray-100(center),
 *   설명 B2 Medium gray-70(center), 제목·설명 간격 8
 * - 푸터: 위 간격 24, 좌우/아래 16, 44px 버튼 2개(Secondary/Primary) 균등폭 + 간격 8
 *
 * 동작: 포커스 트랩·이전 포커스 복원·ESC 닫힘·배경 스크롤 잠금·ARIA 는 Radix 가 담당.
 * AlertDialog 특성상 배경(딤) 클릭으로는 닫히지 않는다 — 취소/확인 중 하나를 고르게 한다.
 */
export interface PopupProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** 좌측 Secondary 버튼 라벨 */
  cancelLabel?: string;
  /** 우측 Primary 버튼 라벨 */
  confirmLabel?: string;
  onConfirm?: () => void;
  className?: string;
}

function Popup({
  open,
  onClose,
  title,
  description,
  cancelLabel = '취소',
  confirmLabel = '확인',
  onConfirm,
  className,
}: PopupProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        // 취소·ESC 등으로 닫힐 때(Radix 가 false 로 알림) onClose 로 위임한다.
        if (!next) onClose();
      }}
    >
      <AlertDialogContent className={cn('w-70', className)}>
        <AlertDialogHeader className="px-8 pt-8">
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>

        {/*
          Figma `2Button_44` 배치라 ButtonGroup 을 그대로 쓴다. 균등폭은 ButtonGroup 의
          flex-1 이 담당하므로 Button 에 fullWidth(w-full)를 주면 안 된다.
          Cancel/Action 은 클릭 시 Radix 가 다이얼로그를 닫는다(→ onOpenChange(false) → onClose).
        */}
        <ButtonGroup size="md" className="mt-6 px-4 pb-4">
          <AlertDialogCancel asChild>
            <Button variant="secondary" size="md">
              {cancelLabel}
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button variant="primary" size="md" onClick={() => onConfirm?.()}>
              {confirmLabel}
            </Button>
          </AlertDialogAction>
        </ButtonGroup>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export { Popup };
