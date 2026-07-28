import { PlaceRow } from '@/features/place';
import { Icon16ExclamationCircle } from '@/shared/icons/NookIcons';
import type { RelatedPlacesState } from '../hooks/useRelatedPlaces';

export interface RelatedPlacesSectionProps {
  state: RelatedPlacesState;
  bookmarkedPlaceIds: string[];
  onBookmarkedChange: (placeId: string, next: boolean) => void;
  onDirectAddClick: () => void;
}

/**
 * Figma `연관 장소` — 파싱 API 의 로딩/성공/실패에 따라 달라지는 섹션.
 * 로딩 중엔 안내 문구만 보여주고, 로딩이 끝나면(성공/실패 모두) 장소 목록(있으면)과
 * "찾는 장소가 없으신가요? 직접 추가" 배너를 함께 보여준다.
 * 실패했다는 사실 자체를 알리는 스낵바는 상위(PostDetailPage)책임이다 — 이 섹션은 배너만 그린다.
 */
function RelatedPlacesSection({
  state,
  bookmarkedPlaceIds,
  onBookmarkedChange,
  onDirectAddClick,
}: RelatedPlacesSectionProps) {
  return (
    <>
      {/* 시안의 6px 회색 띠 — 게시물 정보와 연관 장소를 가르는 구분면 */}
      <div className="mt-4 h-1.5 w-full bg-gray-10" />
      <section className="px-4 pb-6">
        <h2 className="py-4 text-b1 font-semibold text-gray-100">연관 장소</h2>

        {state.status === 'loading' ? (
          <p className="pb-4 text-b2 font-medium text-gray-60">연관 장소를 찾는 중…</p>
        ) : null}

        {state.status === 'success' && state.places.length > 0 ? (
          <div className="flex flex-col gap-4 pb-4">
            {state.places.map((place) => (
              <PlaceRow
                key={place.id}
                place={place}
                bookmarked={bookmarkedPlaceIds.includes(place.id)}
                onBookmarkedChange={(next) => onBookmarkedChange(place.id, next)}
              />
            ))}
          </div>
        ) : null}

        {state.status !== 'loading' ? (
          <button
            type="button"
            onClick={onDirectAddClick}
            className="flex w-full items-center justify-between rounded-sm border border-nook-blue/80 bg-gray-0 px-1 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100"
          >
            <span className="flex items-center gap-2">
              <Icon16ExclamationCircle />
              <span className="text-b2 font-medium text-gray-80">찾는 장소가 없으신가요? </span>
            </span>
            <span className="shrink-0 text-b3 font-semibold text-gray-90">직접 추가</span>
          </button>
        ) : null}
      </section>
    </>
  );
}

export { RelatedPlacesSection };
