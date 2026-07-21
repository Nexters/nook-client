import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type * as React from 'react';
import { cn } from '@/shared/lib/utils';

/**
 * Figma `Tabloid - 4 > Tag` 의 두 컴포넌트를 shadcn Badge 위에 variant 로 묶는다.
 *
 * - `number` = `Tag/24_Number` : fill gray-10, radius 6, h24, 좌우 8,
 *   텍스트 Roboto Mono 12 Regular(E2) / gray-70  → 카운트 배지("99+")
 * - `keyword` = `AI 요약 태그`  : fill gray-10, radius 8, h24, 좌우 12,
 *   텍스트 SUIT 12 Regular(B3) / gray-100        → 키워드 칩("조용한")
 */
const badgeVariants = cva(
  'inline-flex h-6 w-fit shrink-0 items-center justify-center whitespace-nowrap bg-gray-10',
  {
    variants: {
      variant: {
        number: 'rounded-md px-2 font-mono text-e2 text-gray-70',
        keyword: 'rounded-lg px-3 text-b3 font-normal text-gray-100',
      },
    },
    defaultVariants: {
      variant: 'number',
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'span';

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
