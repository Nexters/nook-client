import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import clearIcon from '@/assets/icons/24_delete.svg';
import { cn } from '@/shared/lib/utils';

/**
 * Figma `Tabloid - 4 > Input > inputfield` (Default/Focus/Typing/Filled × Large/Small) 기준.
 *
 * 시안의 4개 상태는 별도 prop 이 아니라 실제 입력 상태에서 파생된다 —
 *   Default  = 비어 있고 포커스 없음       Focus  = 포커스, 값 없음(플레이스홀더 유지)
 *   Typing   = 포커스, 값 있음(X·카운터)    Filled = 포커스 해제, 값 있음
 * 커서(caret)는 네이티브 <input> 이 그리므로 시안의 커서 레이어는 구현하지 않는다.
 *
 * 값 지우기는 `onClear` 를 넘긴 경우에만 X 버튼이 뜨고, 실제 초기화는 사용처가 한다
 * (controlled/uncontrolled 양쪽에서 가짜 change 이벤트를 만들지 않기 위해서다).
 * 글자수는 `maxLength` 를 넘긴 경우에만 표시한다.
 *
 * 주의: 루트가 <input> 이 아니라 wrapper <div> 다. `className` 은 바깥 상자에 붙고,
 * <input> 자체에 붙일 클래스는 `inputClassName` 으로 넘긴다.
 */
const inputVariants = cva(
  [
    'flex w-full items-center gap-2 rounded-lg border bg-gray-0 px-4',
    'border-gray-30 transition-colors focus-within:border-gray-100',
    'has-[:disabled]:cursor-not-allowed has-[:disabled]:border-gray-30 has-[:disabled]:bg-gray-10',
  ],
  {
    variants: {
      scale: {
        /** Scale=Large — 52px, 입력 B1(16) Medium */
        lg: 'h-13 text-b1',
        /** Scale=Small — 44px, 입력 B2(14) Medium */
        sm: 'h-11 text-b2',
      },
    },
    defaultVariants: {
      scale: 'lg',
    },
  },
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  /** <input> 엘리먼트에 직접 붙일 클래스 (`className` 은 wrapper 로 간다) */
  inputClassName?: string;
  /**
   * 넘기면 값이 있을 때 X 버튼이 뜬다. 실제 값 초기화는 사용처 책임.
   * 예) `onClear={() => setValue('')}`
   */
  onClear?: () => void;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      inputClassName,
      scale,
      type = 'text',
      maxLength,
      onClear,
      onChange,
      value,
      defaultValue,
      disabled,
      ...props
    },
    ref,
  ) => {
    // uncontrolled 에서도 글자수를 세야 해서 길이만 별도로 들고 있는다.
    // controlled 면 props.value 가 항상 우선이라 외부에서 값을 바꿔도 어긋나지 않는다.
    const [innerLength, setInnerLength] = React.useState(() => String(defaultValue ?? '').length);
    const length = value !== undefined ? String(value).length : innerLength;

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      setInnerLength(event.target.value.length);
      onChange?.(event);
    };

    const showClear = onClear !== undefined && length > 0 && !disabled;

    return (
      <div className={cn(inputVariants({ scale }), className)}>
        <input
          ref={ref}
          type={type}
          maxLength={maxLength}
          value={value}
          defaultValue={defaultValue}
          disabled={disabled}
          onChange={handleChange}
          className={cn(
            'min-w-0 flex-1 bg-transparent font-medium text-gray-100 outline-none',
            'placeholder:text-gray-50 disabled:cursor-not-allowed disabled:text-gray-50',
            inputClassName,
          )}
          {...props}
        />
        {showClear ? (
          <button
            type="button"
            aria-label="입력 지우기"
            onClick={onClear}
            className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100 focus-visible:ring-offset-1"
          >
            <img src={clearIcon} alt="" className="size-6" />
          </button>
        ) : null}
        {maxLength !== undefined ? (
          <span className="shrink-0 text-right text-b3 font-medium text-gray-50 tabular-nums">
            {length}/{maxLength}
          </span>
        ) : null}
      </div>
    );
  },
);
Input.displayName = 'Input';

export { Input, inputVariants };
