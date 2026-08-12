import failCharacter from '@/assets/images/200_fail.svg';
import { Icon16Refresh } from '@/shared/icons/NookIcons';

// TODO(post): 다시 시도 API 가 아직 없어 버튼만 만들어두고 숨긴다(기획 확인, 2026-08-13).
// 재시도 엔드포인트가 생기면 플래그를 켜고 onRetry 를 연결한다.
const SHOW_RETRY_BUTTON = false;

/**
 * Figma `게시물 상세 > 로딩` 실패 케이스 (node 116:3642).
 * 게시물 조회 실패·본문 처리(FAILED) 공용 — 실패 캐릭터 + 안내 문구 + 다시 시도.
 * 헤더는 상위(PostDetailPage)가 그린다. 세로 중앙 배치는 부모의 flex-1 에 맡긴다.
 */
export function PostDetailErrorView({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 pb-14">
      <img src={failCharacter} alt="" className="size-[200px] object-contain" />
      <p className="text-b1 font-medium text-gray-60">게시물을 불러오지 못했어요</p>
      {SHOW_RETRY_BUTTON ? (
        // 시안 `Button_secondary_36` — 공용 Button 은 라벨이 흰색 고정이라 쓰지 않는다.
        <button
          type="button"
          onClick={onRetry}
          className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-gray-20 px-4 text-b2 font-semibold text-gray-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100 focus-visible:ring-offset-2"
        >
          <Icon16Refresh aria-hidden="true" />
          다시 시도
        </button>
      ) : null}
    </div>
  );
}
