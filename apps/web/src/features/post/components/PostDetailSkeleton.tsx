import type { ReactNode } from 'react';
import { Skeleton } from '@/shared/ui';

/**
 * 게시물 상세 자리 스켈레톤 — 일반 로딩(PostDetailLoadingView)과 파싱 로딩
 * (PostParsingView)이 공유한다. `overlay`는 캐러셀 스켈레톤 위에 absolute 로
 * 얹을 내용물(로띠 마스코트, 진행률 문구)을 받는다.
 */
export function PostDetailSkeleton({ overlay }: { overlay?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 pt-1">
      <div className="relative">
        <div className="flex gap-2 overflow-x-hidden pl-4">
          <Skeleton className="h-[300px] w-[240px] shrink-0" />
          <Skeleton className="h-[300px] w-[240px] shrink-0" />
        </div>
        {overlay}
      </div>

      <div className="flex flex-col gap-1 px-4 pt-8">
        <Skeleton className="h-[30px] w-[206px]" />
        <Skeleton className="h-[21px] w-[306px]" />
      </div>

      <div className="flex flex-col gap-1 px-4 pt-4">
        <Skeleton className="h-6 w-[120px]" />
        <Skeleton className="h-6 w-[154px]" />
      </div>

      <div className="px-4 pt-4">
        <Skeleton className="h-11 w-full" />
      </div>

      <div className="px-4 pt-5">
        <Skeleton className="h-[189px] w-full" />
      </div>
    </div>
  );
}
