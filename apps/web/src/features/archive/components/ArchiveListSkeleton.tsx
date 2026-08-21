import { Skeleton } from '@/shared/ui';

/** 시안의 카드가 한 줄에 썸네일 3개를 놓는다 — `ArchiveCard` 의 VISIBLE_THUMBNAILS 와 같다. */
const THUMBNAIL_SLOTS = 3;

/**
 * 목록이 오기 전 자리를 채우는 카드 수. 첫 화면에 대략 이만큼 보이고, 더 깔아봐야
 * 스크롤 아래로 내려가 보이지 않는다.
 */
const PLACEHOLDER_CARDS = 3;

/**
 * `ArchiveCard` 자리 스켈레톤 한 장 — 여백·간격·높이를 카드와 같게 맞춰 실제 목록이
 * 도착할 때 레이아웃이 튀지 않게 한다.
 * 헤더 줄 높이는 그 줄에서 가장 큰 개수 배지(`Badge variant="number"` = h-6)가 정한다.
 */
function ArchiveCardSkeleton() {
  return (
    <div
      data-slot="archive-card-skeleton"
      className="flex w-full flex-col items-start gap-2 overflow-hidden rounded-sm bg-gray-0 p-4"
    >
      <div className="flex h-6 w-full items-center gap-2">
        {/* 색 스와치 — 실제 카드의 사각 스와치와 같은 모양이라 라운드를 지운다. */}
        <Skeleton className="size-2 shrink-0 rounded-none" />
        <Skeleton className="h-4.5 w-32" />
        <Skeleton className="h-6 w-9 rounded-md" />
      </div>

      {/* 썸네일 줄 — 카드와 같이 폭을 3등분해 늘어난다. */}
      <div className="grid w-full grid-cols-3 gap-2">
        {Array.from({ length: THUMBNAIL_SLOTS }, (_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: 고정 길이 자리표시자
          <Skeleton key={index} className="aspect-square w-full rounded-sm" />
        ))}
      </div>
    </div>
  );
}

/**
 * 아카이브 목록 로딩 뷰 — 카드 자리를 스켈레톤으로 채운다.
 * 예전엔 로딩 동안 아무것도 그리지 않아 목록 영역이 통째로 비어 있었다(빈 상태 문구가
 * 스쳐 지나가는 것을 막으려던 것) — 빈 화면 대신 뼈대를 보여주면서 같은 목적을 지킨다.
 *
 * 목록 컨테이너(`flex flex-col gap-2`)는 실제 목록과 같은 것을 쓴다.
 */
function ArchiveListSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-hidden="true">
      {Array.from({ length: PLACEHOLDER_CARDS }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: 고정 길이 자리표시자
        <ArchiveCardSkeleton key={index} />
      ))}
    </div>
  );
}

export { ArchiveListSkeleton };
