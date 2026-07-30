import loadingAnimation from '@/assets/lottie/loading.json';
import { Lottie, Skeleton } from '@/shared/ui';

/**
 * Figma `게시물 상세 > 로딩` (node 104:3484). 본문/장소 파싱이 끝나지 않은 동안(status
 * loading) 보여준다 — 캐러셀 자리에 로띠 마스코트 + 안내 문구를 겹쳐 놓고 나머지는
 * 스켈레톤으로 채운다.
 */
export function PostDetailLoadingView() {
  return (
    <div className="flex flex-col gap-2 pt-1" role="status" aria-label="게시물 불러오는 중">
      <div className="relative">
        <div className="flex gap-2 overflow-x-hidden pl-4">
          <Skeleton className="h-[300px] w-[240px] shrink-0" />
          <Skeleton className="h-[300px] w-[240px] shrink-0" />
        </div>

        <div className="absolute top-[218px] left-1/2 -translate-x-1/2">
          <Lottie animationData={loadingAnimation} className="size-[120px]" />
        </div>
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
