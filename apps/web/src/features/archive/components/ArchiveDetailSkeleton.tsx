import { PinnedHeaderLayout } from '@/app/layouts/PinnedHeaderLayout';
import { BackButton, BOTTOM_MENU_HEIGHT, Header, Skeleton } from '@/shared/ui';

/**
 * 2열 그리드를 채울 카드 수. 첫 화면에 두 줄이 보이고, 더 깔아도 스크롤 아래로 내려간다.
 */
const PLACEHOLDER_CARDS = 4;

/**
 * 게시물·장소 탭의 카드 자리 스켈레톤.
 * 두 탭이 쓰는 카드(`CollectionCard` / `PlaceCard`)는 텍스트 줄만 조금 다르고 썸네일
 * 비율(167:208)과 2열 그리드가 같아서 하나로 둔다 — 자리를 잡는 건 썸네일이다.
 * 그리드 클래스는 실제 목록과 같은 것을 써서 목록이 도착할 때 레이아웃이 튀지 않게 한다.
 */
function CollectionGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-2 gap-y-5 px-4 pt-4" aria-hidden="true">
      {Array.from({ length: PLACEHOLDER_CARDS }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: 고정 길이 자리표시자
        <div key={index} className="flex w-full flex-col items-start gap-2">
          <Skeleton className="aspect-[167/208] w-full rounded-sm" />
          <div className="flex w-full flex-col gap-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3.5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * 아카이브 상세 전체 로딩 뷰 — 아카이브 메타(`useArchives`)를 기다리는 동안 쓴다.
 * 예전엔 이 구간에 `null` 을 반환해 헤더째 빈 화면이었다. 뒤로가기만이라도 즉시 눌릴
 * 수 있어야 해서 헤더는 실물로 그리고, 이름·탭·카드 자리만 뼈대로 채운다.
 *
 * 고정 헤더의 구성·여백은 `ArchiveDetailPage` 와 같게 맞춘다 — 메타가 도착해 실제
 * 헤더로 바뀔 때 콘텐츠 시작 위치가 움직이지 않아야 한다.
 */
function ArchiveDetailSkeleton() {
  return (
    <PinnedHeaderLayout
      header={
        <>
          <Header left={<BackButton />} />
          {/* 아카이브 정보 — 색 스와치(size-3) + 이름(H1) */}
          <div className="flex flex-col gap-1 px-4 pt-2 pb-4">
            <div className="flex items-center gap-2">
              <Skeleton className="size-3 shrink-0 rounded-none" />
              <Skeleton className="h-7 w-40" />
            </div>
          </div>
          {/* 게시물/장소 탭 — 실제 탭의 py-3 + 경계선까지 같은 높이로 둔다. */}
          <div className="flex px-4">
            {['posts', 'places'].map((key) => (
              <div
                key={key}
                className="flex flex-1 items-center justify-center border-gray-20 border-b px-2.5 py-3"
              >
                <Skeleton className="h-5 w-14" />
              </div>
            ))}
          </div>
        </>
      }
      contentStyle={{ paddingBottom: `calc(1.25rem + ${BOTTOM_MENU_HEIGHT})` }}
    >
      <main>
        <CollectionGridSkeleton />
      </main>
    </PinnedHeaderLayout>
  );
}

export { ArchiveDetailSkeleton, CollectionGridSkeleton };
