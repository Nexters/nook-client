import loadingAnimation from '@/assets/lottie/loading.json';
import { Lottie } from '@/shared/ui';
import { PostDetailSkeleton } from './PostDetailSkeleton';

/**
 * Figma `게시물 상세 > 장소 파싱 로딩` (node 116:3594). 저장 직후 BE 비동기 처리
 * (본문 크롤링 → 장소 파싱)가 도는 동안 보여준다 — 진행률은 상세 폴링(3초)마다
 * 갱신된다. 첫 조회 로딩은 PostDetailLoadingView 가 따로 담당한다.
 */
export function PostParsingView({ percent }: { percent: number }) {
  return (
    <div role="status" aria-label="장소 불러오는 중">
      <PostDetailSkeleton
        overlay={
          <div className="absolute inset-x-0 top-[192px] flex flex-col items-center">
            <div className="relative">
              {/* 시안의 로띠 뒤 원형 글로우 — 에셋 대신 radial-gradient 로 그린다. */}
              <div className="absolute -inset-28 rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,0.95),rgba(255,255,255,0))]" />
              <Lottie animationData={loadingAnimation} className="relative size-[100px]" />
            </div>
            <p className="relative pt-3 text-b2 font-semibold text-gray-100">
              장소 불러오는 중...{percent}%
            </p>
            <div className="relative pt-3 text-center text-b3 font-medium text-gray-60">
              <p>화면을 나가도 저장은 계속될 거예요.</p>
              <p>완료되면 알림을 보내드릴게요.</p>
            </div>
          </div>
        }
      />
    </div>
  );
}

/**
 * 파싱 중 헤더 뒤로가기 버튼 아래 붙는 말풍선 (Figma node 116:3564).
 * 헤더를 감싼 relative 컨테이너 안에서 absolute 로 배치된다.
 */
export function GoHomeTooltip() {
  return (
    <div className="absolute top-[43px] left-[10px] z-10 flex flex-col items-start drop-shadow-[0px_5px_8px_rgba(0,0,0,0.22)]">
      {/* 위쪽 꼬리 22×6 — border 삼각형으로 그린다 */}
      <div className="ml-2.5 h-0 w-0 border-x-[11px] border-b-[6px] border-x-transparent border-b-[rgba(31,31,31,0.8)]" />
      <div className="rounded-[6px] bg-[rgba(31,31,31,0.8)] px-3 py-2">
        <p className="whitespace-nowrap text-b3 font-semibold text-gray-0">홈으로 가기</p>
      </div>
    </div>
  );
}
