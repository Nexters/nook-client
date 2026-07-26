import type * as React from 'react';
import { cn } from '@/shared/lib/utils';

/**
 * Figma `Tabloid - 4 > Popup > Popup_Toast` 기준.
 * 밝은 배경 위에 아이콘 + 메시지 + 단일 액션을 한 줄로 놓는 알림 바.
 *
 * 시안의 44px 캐릭터 일러스트는 상황별로 달라지므로(success/error/fail/lock)
 * 이 컴포넌트가 소유하지 않는다 — `icon` 슬롯으로 받는다.
 * 액션 버튼도 사용처에서 `action` 으로 넘긴 `Button`(size sm)을 그대로 렌더한다.
 *
 * 표시/숨김 타이밍과 큐잉은 이 컴포넌트의 책임이 아니다. 사용처가 렌더 여부를 정한다.
 */
export interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 좌측 44px 슬롯 (img/character/44_* 계열). 생략 가능. */
  icon?: React.ReactNode;
  /** 우측 액션. Figma 는 `Button_Primary_36` → `<Button size="sm">` 을 넣는다. */
  action?: React.ReactNode;
}

function Toast({ icon, action, children, className, ...props }: ToastProps) {
  return (
    <div
      data-slot="toast"
      role="status"
      className={cn(
        'flex h-15 w-full items-center justify-between gap-2 rounded-xl bg-gray-0 px-3 py-1.5 shadow-lg',
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 items-center gap-1">
        {icon ? (
          <span className="flex size-11 shrink-0 items-center justify-center">{icon}</span>
        ) : null}
        <p className="truncate text-b2 font-semibold text-gray-100">{children}</p>
      </div>
      {action}
    </div>
  );
}

export { Toast };
