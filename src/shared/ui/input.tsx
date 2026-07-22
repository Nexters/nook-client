import * as React from 'react';
import { cn } from '@/shared/lib/utils';

/**
 * Figma "inputfield" 컴포넌트 셋(Default/Typing/Focus/Filled) 기준.
 * 실제 커서(caret)는 브라우저 네이티브 <input> 이 처리하므로 별도 구현하지 않는다.
 */
export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          'flex h-[52px] w-full rounded-lg border border-gray-30 bg-gray-0 px-4 text-b1 text-gray-100 outline-none transition-colors',
          'placeholder:text-gray-50',
          'focus-visible:border-gray-100',
          'disabled:cursor-not-allowed disabled:border-gray-30 disabled:bg-gray-10 disabled:text-gray-50',
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
