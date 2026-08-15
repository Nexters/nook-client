import { Checkbox as CheckboxPrimitive } from 'radix-ui';
import type * as React from 'react';
import { CheckBtnSelected, CheckBtnUnselected } from '@/shared/icons/NookIcons';
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
      <CheckIndicator />
    </CheckboxPrimitive.Root>
  );
}

/**
 * 체크 표시의 시각 부분만 떼어낸 것. 상태는 스스로 갖지 않고 두 가지를 본다 —
 * 조상 Radix Root 의 `data-state="checked"`, 또는 앞선 형제 `peer` input 의 `:checked`.
 *
 * 행 전체가 하나의 컨트롤인 경우(예: 아카이브 선택 행)에는 숨긴 네이티브 checkbox 를
 * `peer` 로 두고 이걸 표시로 쓴다. `Checkbox` 는 button 이라 중첩할 수 없어서다.
 */
function CheckIndicator({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn('relative size-6 shrink-0', className)}>
      <CheckBtnUnselected className="absolute inset-0 group-data-[state=checked]:hidden peer-checked:hidden" />
      <CheckBtnSelected className="absolute inset-0 hidden group-data-[state=checked]:block peer-checked:block" />
    </span>
  );
}

export { Checkbox, CheckIndicator };
