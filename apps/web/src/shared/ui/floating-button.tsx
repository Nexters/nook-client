import * as React from 'react';
import { cn } from '@/shared/lib/utils';
import { Button, type ButtonProps } from './button';

/**
 * Figma `Button/48_add`(dark·48px) + `Button/40_location`(light·40px) 기준.
 * 두 시안이 같은 "콘텐츠 위에 뜨는 원형 아이콘 버튼"이라 size·tone 으로 합쳤다.
 *
 * `Button` 위에 원형·고정 배치만 얹은 조합 — hover/focus/disabled 동작은 Button 이
 * 소유하고 여기선 원형·패딩 제거와 tone 색만 덮는다.
 * 기본값(`floating`)은 우하단 고정 + safe-area·BottomMenu 높이 회피.
 * `floating={false}` 면 부모가 위치를 잡는 인라인 원형 버튼.
 */
export interface FloatingButtonProps extends Omit<ButtonProps, 'variant' | 'size' | 'fullWidth'> {
  /** false 면 fixed 배치를 끄고 일반 인라인 원형 버튼으로 렌더한다. */
  floating?: boolean;
  /** true 면 하단 탭바(BottomMenu, 65px) 높이만큼 더 띄운다. */
  aboveBottomMenu?: boolean;
  /** `lg` = Button/48_add(48px), `md` = Button/40_location(40px) */
  size?: 'lg' | 'md';
  /** `dark` = gray-100 배경(추가 버튼), `light` = 흰 배경(지도 위 현위치 버튼) */
  tone?: 'dark' | 'light';
}

const SIZE_CLASS = {
  lg: 'size-12',
  md: 'size-10',
} as const;

/**
 * 기본 아이콘 — 시안 `Button/48_add` 안의 16px 플러스.
 * `src/assets/icons` 에 대응 애셋이 없어 인라인으로 그린다
 * (`24_add.svg` 는 밝은 원+플러스라 다른 아이콘이다).
 * currentColor 라 tone 에 따라 흰색/검정을 그대로 상속받는다.
 */
function PlusGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const FloatingButton = React.forwardRef<HTMLButtonElement, FloatingButtonProps>(
  (
    {
      floating = true,
      aboveBottomMenu = false,
      size = 'lg',
      tone = 'dark',
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
          'rounded-full p-0 shadow-lg',
          SIZE_CLASS[size],
          // light 는 Button 의 primary 색을 덮는다. 시안에 이 조합이 여기서만 나와서
          // Button variant 로 올리지 않았다 — 다른 곳에도 생기면 그때 승격한다.
          // disabled 는 opacity 로 표현한다 — 아이콘이 원판까지 포함한 애셋일 수 있어
          // (`40_location.svg`) 배경색만 바꾸면 가려져 보이지 않는다.
          tone === 'light' &&
            'bg-gray-0 text-gray-100 hover:bg-gray-10 active:bg-gray-10 disabled:opacity-40',
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
