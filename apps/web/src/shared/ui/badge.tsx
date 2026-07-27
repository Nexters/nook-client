import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type * as React from 'react';
import { cn } from '@/shared/lib/utils';

/**
 * Figma `Tabloid - 4 > Tag` 기준.
 * - `number`  — `Tag/24 > Property 1=Number` 카운트 배지("99+", Roboto Mono)
 * - `label`   — `Tag/24 > Property 1=Kor`    짧은 한글 라벨("조용한", SUIT Medium)
 * - `keyword` — `AI 요약 태그` 키워드 칩. 위 둘과 다른 컴포넌트라 여백·색이 다르다.
 */
const badgeVariants = cva(
  'inline-flex h-6 w-fit shrink-0 items-center justify-center whitespace-nowrap bg-gray-10',
  {
    variants: {
      variant: {
        number: 'rounded-md px-2 font-mono text-e2 text-gray-70',
        label: 'rounded-md px-2 text-b3 font-medium text-gray-70',
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
