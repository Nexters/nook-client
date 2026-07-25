import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type * as React from 'react';
import { cn } from '@/shared/lib/utils';

/**
 * Figma `Tabloid - 4 > Tag` 기준.
 * - `number`  — 카운트 배지("99+")
 * - `keyword` — 키워드 칩("조용한")
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
