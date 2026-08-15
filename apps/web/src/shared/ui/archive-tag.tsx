import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';
import { cn } from '@/shared/lib/utils';
import { type ArchiveColor, COLOR_BG_CLASS } from './color-chip';

/**
 * Figma `Tabloid - 4 > Chips > Chip/Archive_Tag` 기준.
 * 아카이브 색 스와치 + 라벨을 한 줄로 붙인 칩.
 *
 * `onClick` 을 주면 button, 없으면 표시 전용 span 으로 렌더한다 (모양은 같다).
 * 선택 인터랙션이 있는 색상 스와치는 `ColorChip` 이 담당한다.
 */
const archiveTagVariants = cva(
  'inline-flex w-fit shrink-0 items-center rounded-md border border-gray-20 font-semibold text-gray-80',
  {
    variants: {
      size: {
        /** Property 1=Large — 28px, 라벨 B2(14) */
        lg: 'h-7 gap-1.5 px-2.5 text-b2',
        /** Property 1=Small — 24px, 라벨 B3(12) */
        sm: 'h-6 gap-1 px-2 text-b3',
      },
    },
    defaultVariants: {
      size: 'lg',
    },
  },
);

export interface ArchiveTagProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'color'>,
    VariantProps<typeof archiveTagVariants> {
  color: ArchiveColor;
}

function ArchiveTag({ color, size, className, children, onClick, ...props }: ArchiveTagProps) {
  const Tag = onClick ? 'button' : 'span';

  return (
    <Tag
      data-slot="archive-tag"
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={cn(
        archiveTagVariants({ size }),
        onClick && 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100',
        className,
      )}
      {...props}
    >
      {/* 스와치는 두 size 모두 8px 고정 (시안 기준) */}
      <span className={cn('size-2 shrink-0', COLOR_BG_CLASS[color])} aria-hidden="true" />
      {children}
    </Tag>
  );
}

export { ArchiveTag, archiveTagVariants };
