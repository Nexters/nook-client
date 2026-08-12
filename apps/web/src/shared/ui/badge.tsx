import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type * as React from 'react';
import { cn } from '@/shared/lib/utils';

/**
 * Figma `Tabloid - 4 > Tag` 기준.
 * - `number`  — `Tag/24 > Property 1=Number` 카운트 배지("99+", Roboto Mono)
 * - `label`   — `Tag/24 > Property 1=Kor`    짧은 한글 라벨("조용한", SUIT Medium)
 * - `keyword` — `AI 요약 태그` 키워드 칩. 위 둘과 다른 컴포넌트라 여백·색이 다르다.
 * - `photo`   — `추가되는 컴포넌트 > 사진 태그`(126:2574) 사진 위 카운터("1/6").
 *
 * `photo` 의 80% 가 두 번 걸린 건 오타가 아니다 — 시안 노드가 fill #1F1F1F 80% 위에
 * 레이어 opacity 80% 를 또 얹는다. 배경은 실효 64%, 안쪽 흰 글자도 80% 로 흐려지는 게
 * 시안 렌더와 같은 결과다. 배경만 64%(`bg-gray-100/64`)로 줄이면 글자가 또렷해서 달라진다.
 */
const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center whitespace-nowrap',
  {
    variants: {
      variant: {
        number: 'h-6 rounded-md bg-gray-10 px-2 font-mono text-e2 text-gray-70',
        label: 'h-6 rounded-md bg-gray-10 px-2 text-b3 font-medium text-gray-70',
        keyword: 'h-6 rounded-lg bg-gray-10 px-3 text-b3 font-normal text-gray-100',
        photo: 'rounded-sm bg-gray-100/80 px-2 py-0.5 text-b3 font-medium text-gray-0 opacity-80',
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
