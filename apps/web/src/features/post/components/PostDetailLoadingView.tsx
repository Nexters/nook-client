import loadingAnimation from '@/assets/lottie/loading.json';
import { Lottie } from '@/shared/ui';
import { PostDetailSkeleton } from './PostDetailSkeleton';

/**
 * Figma `게시물 상세 > 로딩` (node 116:3716). 첫 응답을 기다리는 동안(status
 * loading) 보여준다 — 본문 처리(파싱) 중에는 PostParsingView 가 대신 뜬다.
 */
export function PostDetailLoadingView() {
  return (
    <div role="status" aria-label="게시물 불러오는 중">
      <PostDetailSkeleton
        overlay={
          <div className="absolute top-[218px] left-1/2 -translate-x-1/2">
            <Lottie animationData={loadingAnimation} className="size-[120px]" />
          </div>
        }
      />
    </div>
  );
}
