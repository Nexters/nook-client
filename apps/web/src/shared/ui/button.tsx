import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import * as React from 'react';
import { cn } from '@/shared/lib/utils';

/**
 * Figma `Tabloid - 4 > Button > Box Btn` 기준.
 * 라벨은 전 variant·상태에서 흰색(gray-0) 고정. 색/타이포/여백은 @theme 토큰만 사용.
 */
const buttonVariants = cva(
  [
    'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg',
    'font-semibold text-gray-0 transition-colors',
    '[&_svg]:size-4 [&_svg]:shrink-0',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:bg-gray-30 disabled:text-gray-0',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-gray-100 hover:bg-gray-90 active:bg-gray-90',
        secondary: 'bg-gray-60 hover:bg-gray-70 active:bg-gray-70',
      },
      size: {
        /** Box Btn_48px — 라벨 B1(16) SemiBold */
        lg: 'h-12 px-4 text-b1',
        /** Box Btn_44px — 라벨 B2(14) SemiBold */
        md: 'h-11 px-4 text-b2',
        /** Box Btn_36px — 라벨 B2(14) SemiBold */
        sm: 'h-9 px-4 text-b2',
      },
      /**
       * true 면 가로 폭을 꽉 채운다 (Figma 의 343px 풀블리드 버튼 대응).
       *
       * 주의: flex 컨테이너 안에서 버튼을 나란히 놓을 땐 쓰지 말 것.
       * Button 은 `shrink-0` 이라 `w-full` 이 붙으면 각 버튼이 컨테이너 폭을
       * 통째로 차지해 부모 밖으로 넘친다. 그 경우엔 ButtonGroup 을 쓴다.
       */
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** true 면 자식 엘리먼트에 버튼 스타일/속성만 합성한다 (예: <Button asChild><Link .../></Button>) */
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, fullWidth, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot.Root : 'button';
    return (
      <Comp
        ref={ref}
        // asChild 로 <a> 등을 렌더할 땐 type 을 붙이지 않는다.
        type={asChild ? type : (type ?? 'button')}
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
