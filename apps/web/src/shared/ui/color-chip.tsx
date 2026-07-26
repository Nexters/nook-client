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

/** Figma "Chip_GroupColor" 기준 그룹 색상 선택 스와치 1개. */
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
          selected && 'ring-1 ring-gray-100 ring-offset-2 ring-offset-gray-0',
          className,
        )}
        {...props}
      />
    );
  },
);
ColorChip.displayName = 'ColorChip';

export { ColorChip };
