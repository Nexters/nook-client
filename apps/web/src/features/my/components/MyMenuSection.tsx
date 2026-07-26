import type * as React from 'react';
import { cn } from '@/shared/lib/utils';

/**
 * 마이페이지 설정 목록의 영역 구분.
 * 시안 기준 두 영역이 있다 —
 *   계정 정보 : 로그인 정보
 *   앱 정보   : 버전 정보 / 개인정보 처리방침 / 이용약관 / 문의하기
 *
 * `MyMenuRow` 들을 children 으로 받는 얇은 묶음이다. 행 자체의 모양은 행이 소유한다.
 *
 * 주의: 영역 제목의 타이포/여백은 대응하는 Figma 노드를 찾지 못해 토큰 기본값
 * (B3 gray-60)으로 뒀다. 시안이 나오면 그 값으로 맞춰야 한다.
 */
export interface MyMenuSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

function MyMenuSection({ title, children, className }: MyMenuSectionProps) {
  return (
    <section className={cn('flex w-full flex-col', className)}>
      <h3 className="px-4 py-2 text-b3 font-medium text-gray-60">{title}</h3>
      <div className="flex w-full flex-col">{children}</div>
    </section>
  );
}

export { MyMenuSection };
