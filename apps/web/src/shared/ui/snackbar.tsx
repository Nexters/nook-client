import type * as React from 'react';
import { cn } from '@/shared/lib/utils';

/**
 * Figma `Tabloid - 4 > Popup > snackbar` 기준.
 * 어두운 반투명 배경 위에 제목(+보조 설명)과 단일 액션을 놓는 알림 바.
 * 밝은 배경의 `Toast` 와 쓰임이 다르다 — 이건 화면 위에 덮이는 쪽이다.
 *
 * 시안의 액션 버튼은 흰 배경 + gray-100 라벨이라 Button 의 primary/secondary 어디에도
 * 없다. Figma 에서도 `Button_Primary_36` 인스턴스를 스낵바 안에서만 색 오버라이드해
 * 쓰므로, 여기서도 variant 로 승격하지 않고 사용처가 className 으로 덮는다.
 * 같은 조합이 다른 곳에도 나오면 그때 Button variant 로 올린다.
 */
// `title` 은 네이티브 툴팁 속성과 이름이 겹쳐서 걷어내고 ReactNode 로 다시 정의한다.
export interface SnackbarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** 굵은 첫 줄 (B2 Medium) */
  title: React.ReactNode;
  /** 보조 설명 (B3 Regular). 없으면 한 줄짜리 스낵바가 된다. */
  description?: React.ReactNode;
  /** 우측 액션. Figma 는 `Button_Primary_36` → `<Button size="sm">` 을 넣는다. */
  action?: React.ReactNode;
}

function Snackbar({ title, description, action, className, ...props }: SnackbarProps) {
  return (
    <div
      data-slot="snackbar"
      role="status"
      className={cn(
        'flex h-15 w-full items-center gap-2.5 rounded-xl bg-gray-100/80 px-3 py-2',
        // 시안 전용 값 — 디자인 시스템에 blur/shadow 토큰이 없어 정확도를 위해 그대로 쓴다.
        'shadow-[0_5px_16px_0_rgba(0,0,0,0.22)] backdrop-blur-[2px]',
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-b2 font-medium text-gray-0">{title}</p>
        {description ? (
          <p className="truncate text-b3 font-normal text-gray-20">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export { Snackbar };
