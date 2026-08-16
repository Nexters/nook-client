import type { Place } from '@/features/place';
import { PlaceDeletePopup, PlaceRow } from '@/features/place';
import { usePlaceDeletion } from '@/features/place/lib/usePlaceDeletion';
import { Icon16ExclamationCircle } from '@/shared/icons/NookIcons';
import type { RelatedPlacesState } from '../api/queries';

export interface RelatedPlacesSectionProps {
  state: RelatedPlacesState;
  /**
   * 게시물 상세 응답(`PostDetail.places`)의 장소 — 직접 연결한 장소가 파싱 응답에는
   * 없을 수 있어(파싱 FAILED 게시물 등) 두 출처를 합쳐 보여준다. 겹치면 파싱 쪽을 쓴다.
   */
  postPlaces: Place[];
  bookmarkedPlaceIds: string[];
  onBookmarkedChange: (placeId: string, next: boolean) => void;
  onDirectAddClick: () => void;
  /** 장소 행을 누르면 그 장소 id 로 호출된다 — 지도 화면의 선택된 장소 뷰로 넘길 때 쓴다. */
  onPlaceClick?: (placeId: string) => void;
}

/**
 * Figma `연관 장소`(화면 문구는 "게시물에 포함된 장소") — 파싱 API 의 로딩/성공/실패에
 * 따라 달라지는 섹션.
 * 로딩 중엔 안내 문구만 보여주고, 로딩이 끝나면(성공/실패 모두) 장소 목록(있으면)과
 * "찾으시는 장소가 없으신가요? 직접 추가" 배너를 함께 보여준다.
 * 게시물 상세 응답에만 있는 장소(`postPlaces`, 직접 연결 등)는 파싱 상태와 무관하게 항상
 * 목록에 포함된다 — 파싱이 실패했어도 방금 직접 추가한 장소는 바로 보여야 하기 때문이다.
 * 실패했다는 사실 자체를 알리는 스낵바는 상위(PostDetailPage)책임이다 — 이 섹션은 배너만 그린다.
 */
function RelatedPlacesSection({
  state,
  postPlaces,
  bookmarkedPlaceIds,
  onBookmarkedChange,
  onDirectAddClick,
  onPlaceClick,
}: RelatedPlacesSectionProps) {
  const deletion = usePlaceDeletion();
  const parsedPlaces = state.status === 'success' ? state.places : [];
  const places = [
    ...parsedPlaces,
    ...postPlaces.filter((place) => !parsedPlaces.some((parsed) => parsed.id === place.id)),
  ].filter((place) => !deletion.deletedPlaceIds.includes(place.id));

  return (
    <>
      {/* 시안의 6px 회색 띠 — 게시물 정보와 장소 목록을 가르는 구분면 */}
      <div className="mt-4 h-1.5 w-full bg-gray-10" />
      <section className="px-4 pb-6">
        <h2 className="py-4 text-b1 font-semibold text-gray-100">게시물에 포함된 장소</h2>

        {state.status === 'loading' ? (
          <p className="pb-4 text-b2 font-medium text-gray-60">게시물에 포함된 장소를 찾는 중…</p>
        ) : null}

        {places.length > 0 ? (
          // 좌우 여백은 행이 갖는다(삭제 스와이프에서 여백째 밀려나가야 한다) — 섹션의 px-4 를 상쇄한다.
          <div className="-mx-4 flex flex-col gap-4 pb-4">
            {places.map((place) => (
              <PlaceRow
                key={place.id}
                place={place}
                bookmarked={bookmarkedPlaceIds.includes(place.id)}
                onBookmarkedChange={(next) => onBookmarkedChange(place.id, next)}
                onClick={onPlaceClick ? () => onPlaceClick(place.id) : undefined}
                onDelete={() => deletion.requestDelete({ id: place.id, name: place.name })}
              />
            ))}
          </div>
        ) : null}

        {state.status !== 'loading' ? (
          // 시안 183:23093 — 행 전체가 진입점이고, 우측 "직접추가"만 칩(테두리 버튼)으로 보인다.
          <button
            type="button"
            onClick={onDirectAddClick}
            className="flex h-12 w-full items-center justify-between rounded-sm bg-gray-0 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100"
          >
            <span className="flex items-center gap-2 px-0.5">
              <Icon16ExclamationCircle />
              <span className="text-b2 font-medium text-gray-60">찾는 장소가 없으신가요? </span>
            </span>
            <span className="shrink-0 rounded-sm border border-gray-20 bg-gray-0 px-2 py-1.5 text-b3 font-semibold text-gray-80">
              직접추가
            </span>
          </button>
        ) : null}
      </section>

      <PlaceDeletePopup deletion={deletion} />
    </>
  );
}

export { RelatedPlacesSection };
