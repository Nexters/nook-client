import * as React from 'react';
import { cn } from '@/shared/lib/utils';
import { Button, type ButtonProps } from './button';

/**
 * Figma `Tabloid - 4 > Button > Floating Btn` 기준.
 * `Button`(variant primary) 위에 원형·고정 배치만 얹은 조합 — 색/hover/focus/disabled 는
 * Button 이 소유하고 여기선 원형·패딩 제거만 덮는다.
 * 기본값(`floating`)은 우하단 고정 + safe-area·BottomMenu 높이 회피.
 * `floating={false}` 면 부모가 위치를 잡는 인라인 원형 버튼.
 */
export interface FloatingButtonProps extends Omit<ButtonProps, 'variant' | 'size' | 'fullWidth'> {
  /** false 면 fixed 배치를 끄고 일반 인라인 원형 버튼으로 렌더한다. */
  floating?: boolean;
  /** true 면 하단 탭바(BottomMenu, 65px) 높이만큼 더 띄운다. */
  aboveBottomMenu?: boolean;
}

function PlusGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

const FloatingButton = React.forwardRef<HTMLButtonElement, FloatingButtonProps>(
  (
    {
      floating = true,
      aboveBottomMenu = false,
      className,
      children,
      'aria-label': ariaLabel = '추가',
      style,
      ...props
    },
    ref,
  ) => {
    return (
      <Button
        ref={ref}
        variant="primary"
        aria-label={ariaLabel}
        className={cn(
          'size-12 rounded-full p-0 shadow-lg',
          floating && 'fixed right-5 z-40',
          className,
        )}
        style={
          floating
            ? {
                // safe-area + (옵션) 하단 탭바 65px 를 피해 앉는다.
                bottom: `calc(env(safe-area-inset-bottom) + ${aboveBottomMenu ? '81px' : '20px'})`,
                ...style,
              }
            : style
        }
        {...props}
      >
        {children ?? <PlusGlyph />}
      </Button>
    );
  },
);
FloatingButton.displayName = 'FloatingButton';

export { FloatingButton };
