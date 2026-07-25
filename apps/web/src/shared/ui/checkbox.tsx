import { Checkbox as CheckboxPrimitive } from 'radix-ui';
import type * as React from 'react';
import { cn } from '@/shared/lib/utils';

/**
 * Figma `Tabloid - 4 > Button > Check Btn` (`Check_Btn` 컴포넌트 셋) 기준.
 * Radix Checkbox 위에 우리 디자인(원형 스와치)을 입힌다.
 *
 * - 터치 영역 24x24(Root), 내부 원 22x22.
 * - Selected(data-state=checked)  = 원 fill gray-100
 * - Unselected                    = 원 fill gray-20
 * - 체크 글리프는 두 상태 모두 흰색(gray-0)이고, 원 색으로만 선택 여부를 구분한다.
 *
 * controlled(`checked`) / uncontrolled(`defaultChecked`) / `onCheckedChange` 는
 * Radix Checkbox 가 네이티브로 제공한다. 색상은 전부 @theme 토큰 유틸만 사용한다.
 */
function Checkbox({
  className,
  'aria-label': ariaLabel = '선택',
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      aria-label={ariaLabel}
      className={cn(
        'group inline-flex size-6 shrink-0 items-center justify-center rounded-full',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-40',
        className,
      )}
      {...props}
    >
      {/* 5.5 = 22px (Tailwind v4 spacing 스케일 1 = 4px) */}
      <span className="flex size-5.5 items-center justify-center rounded-full bg-gray-20 transition-colors group-data-[state=checked]:bg-gray-100">
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
          className="text-gray-0"
        >
          <path
            d="M2.5 6.2 4.9 8.5 9.5 3.8"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
