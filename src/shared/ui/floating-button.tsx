import * as React from 'react';
import { cn } from '@/shared/lib/utils';
import { Button, type ButtonProps } from './button';

/**
 * Figma `Tabloid - 4 > Button > Floating Btn` (`Button/48_add`) 기준.
 *
 * 48x48 원형 / fill gray-100 / 내부 16px 아이콘(gray-0).
 *
 * shadcn 에는 FAB 프리미티브가 없으므로 우리 `Button`(variant primary) 위에 원형·고정
 * 배치만 얹은 조합이다. 색/hover/focus/disabled/아이콘 크기는 Button 이 소유하며 여기서
 * 중복 정의하지 않는다 — 원형(rounded-full)·48px(size-12)·패딩 제거(p-0)만 덮는다.
 *
 * "Floating" 이 이름뿐이 아니라 실제 동작이 되도록, 기본값(`floating`)에서
 * viewport 우하단에 고정되고 iOS safe-area 와 BottomMenu 높이를 함께 피해 앉는다.
 * 정적으로 배치하고 싶을 땐 `floating={false}` 로 끄고 부모가 위치를 잡는다.
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
