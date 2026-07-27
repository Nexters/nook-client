import type * as React from 'react';
import { cn } from '@/shared/lib/utils';

/**
 * 마이페이지 설정 목록의 영역 구분.
 * 시안 기준 두 영역이 있다 —
 *   계정 정보 : 로그인 정보
 *   앱 정보   : 버전 정보 / 개인정보 처리방침 / 이용약관 / 문의하기
 *
 * `MyMenuRow` 들을 하나의 흰 카드로 묶는다. 카드의 모서리와 행 사이의 연결은
 * section 이 소유하고, 각 행은 높이와 내부 정렬만 소유한다.
 */
export interface MyMenuSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

function MyMenuSection({ title, children, className }: MyMenuSectionProps) {
  return (
    <section className={cn('flex w-full flex-col', className)}>
      <h3 className="text-b2 font-semibold text-gray-70">{title}</h3>
      <div className="mt-3 flex w-full flex-col overflow-hidden rounded-sm bg-gray-0">
        {children}
      </div>
    </section>
  );
}

export { MyMenuSection };
