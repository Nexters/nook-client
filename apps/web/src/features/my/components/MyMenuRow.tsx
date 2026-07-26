import type * as React from 'react';
import arrowRight from '@/assets/icons/16_arrow_right.svg';
import { cn } from '@/shared/lib/utils';

/**
 * Figma `List/My > Property 1=icon+text+arrow | icon+text+tag`.
 * 마이페이지 설정 목록의 한 줄 — 좌측 아이콘+라벨, 우측 값(+배지 또는 화살표).
 *
 * 두 variant 는 prop 조합에서 파생된다 —
 *   icon+text+arrow → `onClick` 을 주면 화살표가 붙고 행이 버튼이 된다
 *   icon+text+tag   → `badge` 를 주면 값 앞에 알약 배지가 붙는다
 *
 * 배지는 공용 `Badge` 와 형태가 다르다(gray-100 채움 / 28px / radius 20). 시안에서
 * 여기서만 쓰여 승격하지 않았다 — 다른 곳에도 나오면 Badge variant 로 올린다.
 */
export interface MyMenuRowProps {
  /** 좌측 16px 아이콘 슬롯 */
  icon?: React.ReactNode;
  label: string;
  /** 우측 값 (예: "kakao", "v1.0"). 영문/버전 표기라 모노로 그린다. */
  value?: string;
  /** 값 앞에 붙는 알약 배지 (예: "최신버전") */
  badge?: string;
  onClick?: () => void;
  className?: string;
}

function MyMenuRow({ icon, label, value, badge, onClick, className }: MyMenuRowProps) {
  const Comp = onClick ? 'button' : 'div';

  return (
    <Comp
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={cn(
        'flex h-16 w-full items-center justify-between gap-2 overflow-hidden rounded-sm bg-gray-0 px-4 text-left',
        onClick &&
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100 focus-visible:ring-inset',
        className,
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        {icon}
        <span className="truncate text-b2 font-medium text-gray-100">{label}</span>
      </span>

      <span className="flex shrink-0 items-center gap-2">
        {badge ? (
          <span className="flex h-7 items-center justify-center rounded-[20px] bg-gray-100 px-2.5 text-b3 font-semibold text-gray-0">
            {badge}
          </span>
        ) : null}
        {value ? <span className="text-right font-mono text-e1 text-gray-50">{value}</span> : null}
        {onClick ? <img src={arrowRight} alt="" className="size-4 shrink-0" /> : null}
      </span>
    </Comp>
  );
}

export { MyMenuRow };
