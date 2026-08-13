import * as React from 'react';
import { cn } from '@/shared/lib/utils';

/** src/styles/global.css @theme 의 --color-* 그룹 컬러 토큰과 1:1 대응. */
export const GROUP_COLORS = [
  'yellow',
  'red',
  'pink',
  'purple',
  'blue',
  'sky',
  'green',
  'cement',
] as const;

export type GroupColor = (typeof GROUP_COLORS)[number];

// Tailwind 가 클래스명을 정적으로 스캔할 수 있도록 템플릿 문자열이 아닌
// 리터럴 매핑을 사용한다 (동적 `bg-${color}` 는 빌드 시 purge 될 수 있음).
export const COLOR_BG_CLASS: Record<GroupColor, string> = {
  yellow: 'bg-yellow',
  red: 'bg-red',
  pink: 'bg-pink',
  purple: 'bg-purple',
  blue: 'bg-blue',
  sky: 'bg-sky',
  green: 'bg-green',
  cement: 'bg-cement',
};

/**
 * 그룹 색상을 글자색으로 — `fill="currentColor"` 인 SVG 를 그룹 색으로 칠할 때도 쓴다
 * (지도 선택 핀). 리터럴 매핑을 쓰는 이유는 `COLOR_BG_CLASS` 와 같다.
 */
export const COLOR_TEXT_CLASS: Record<GroupColor, string> = {
  yellow: 'text-yellow',
  red: 'text-red',
  pink: 'text-pink',
  purple: 'text-purple',
  blue: 'text-blue',
  sky: 'text-sky',
  green: 'text-green',
  cement: 'text-cement',
};

/**
 * Figma "Chip_GroupColor" 기준 그룹 색상 선택 스와치 1개.
 *
 * 스와치는 20px 정사각. 선택 표시는 시안이 스와치 바깥 4px 자리에 1px gray-100 테두리를
 * 두르는 형태라(총 28px) ring-offset 3px + ring 1px 으로 그린다 — ring 은 레이아웃을
 * 밀지 않으므로 선택 여부와 무관하게 줄 간격(시안 20px)이 유지된다.
 */
export interface ColorChipProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  color: GroupColor;
  selected?: boolean;
}

const ColorChip = React.forwardRef<HTMLButtonElement, ColorChipProps>(
  ({ color, selected = false, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        aria-pressed={selected}
        aria-label={`${color} 그룹 색상`}
        className={cn(
          'h-5 w-5 shrink-0',
          COLOR_BG_CLASS[color],
          selected && 'ring-1 ring-gray-100 ring-offset-[3px] ring-offset-gray-0',
          className,
        )}
        {...props}
      />
    );
  },
);
ColorChip.displayName = 'ColorChip';

export { ColorChip };
