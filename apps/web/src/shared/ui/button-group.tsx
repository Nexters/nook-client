import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';
import { cn } from '@/shared/lib/utils';

/**
 * Figma `Tabloid - 4 > 2Button_52 / 2Button_44` 기준.
 * Secondary(좌) + Primary(우) 를 균등폭으로 나란히 놓는 레이아웃 래퍼.
 *
 * 균등폭은 여기서 `flex-1` 로 처리하므로, 자식 Button 에 `fullWidth` 를 주면 안 된다.
 * (Button 은 `shrink-0` 이라 `w-full` 이 붙으면 각 버튼이 컨테이너 폭을 통째로 차지해
 *  부모 밖으로 넘친다. `min-w-0` 은 긴 라벨이 폭을 밀어내지 않게 하는 안전장치.)
 *
 * 버튼 자체의 크기/색은 Button 컴포넌트가 소유하고, 여기선 배치와 간격만 정의한다.
 */
const buttonGroupVariants = cva('flex w-full items-center [&>*]:min-w-0 [&>*]:flex-1', {
  variants: {
    /** 짝을 이루는 버튼 높이에 맞춘 간격 — lg(48px 버튼) 12, md(44px 버튼) 8 */
    size: {
      lg: 'gap-3',
      md: 'gap-2',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export interface ButtonGroupProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof buttonGroupVariants> {}

function ButtonGroup({ className, size, ...props }: ButtonGroupProps) {
  return <div className={cn(buttonGroupVariants({ size, className }))} {...props} />;
}

export { ButtonGroup, buttonGroupVariants };
