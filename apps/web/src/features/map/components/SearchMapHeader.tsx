import { Icon24Back, Icon24Delete } from '@/shared/icons/NookIcons';

/**
 * 검색 결과 지도의 상단 검색 헤더 — Figma `홈_지도`(403:18104), NOOK-383.
 *
 * 검색어는 "지금 탐색 중인 조건"이라 결과 밖 장소를 눌러도 그대로 둔다. 여기서 검색어를 바로
 * 고치지는 않는다 — 고치려면 결과 목록으로 돌아가야 해서, 필드를 누르는 것도 뒤로가기와 같다.
 */
export function SearchMapHeader({
  query,
  onBack,
  onClear,
}: {
  query: string;
  /** 검색 결과 목록으로 돌아간다(보던 스크롤·검색어 유지). */
  onBack: () => void;
  /** 검색어를 지우고 결과 목록(빈 검색 화면)으로 돌아간다. */
  onClear: () => void;
}) {
  return (
    <div
      className="pointer-events-none absolute inset-x-3 top-0 z-10"
      // 상태바 아래 6px — 시안은 54px 상태바 + 6px.
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.375rem)' }}
    >
      <div className="pointer-events-auto flex h-11 w-full items-center gap-2 rounded-lg bg-gray-0 px-3 drop-shadow-[0_0_4.4px_rgba(0,0,0,0.1)]">
        <button
          type="button"
          aria-label="검색 결과로 돌아가기"
          onClick={onBack}
          className="shrink-0"
        >
          <Icon24Back />
        </button>
        <button
          type="button"
          onClick={onBack}
          className="min-w-0 flex-1 truncate text-left text-b2 font-medium text-gray-100"
        >
          {query}
        </button>
        <button type="button" aria-label="검색어 지우기" onClick={onClear} className="shrink-0">
          <Icon24Delete />
        </button>
      </div>
    </div>
  );
}
