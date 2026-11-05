import failCharacter from '@/assets/images/200_fail.svg';
import { Icon16Refresh } from '@/shared/icons/NookIcons';

/**
 * Figma `게시물 상세 > 로딩` 실패 케이스 (node 116:3642).
 * 게시물 조회 실패·본문 처리(FAILED) 공용 — 실패 캐릭터 + 안내 문구 + 다시 시도.
 * 다시 시도가 무엇을 하는지(재조회 / 복구 요청)는 상위가 정한다. `onRetry` 가 없으면 버튼을 숨긴다.
 * 헤더는 상위(PostDetailPage)가 그린다. 세로 중앙 배치는 부모의 flex-1 에 맡긴다.
 */
export function PostDetailErrorView({
  onRetry,
  retryDisabled = false,
}: {
  onRetry?: () => void;
  retryDisabled?: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 pb-14">
      <img src={failCharacter} alt="" className="size-[200px] object-contain" />
      <p className="text-center text-b1 font-medium text-gray-60">
        일시적인 오류로
        <br />
        게시물을 불러오지 못했어요
      </p>
      {onRetry ? (
        // 시안 `Button_secondary_36` — 공용 Button 은 라벨이 흰색 고정이라 쓰지 않는다.
        <button
          type="button"
          onClick={onRetry}
          disabled={retryDisabled}
          className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-gray-20 px-4 text-b2 font-semibold text-gray-90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100 focus-visible:ring-offset-2"
        >
          <Icon16Refresh aria-hidden="true" />
          다시 시도
        </button>
      ) : null}
    </div>
  );
}
