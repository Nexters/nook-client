import type { Place } from '@/features/place';
import { PlaceDeletePopup, PlaceRow } from '@/features/place';
import { usePlaceDeletion } from '@/features/place/lib/usePlaceDeletion';
import { Icon16ExclamationCircle } from '@/shared/icons/NookIcons';
import type { RelatedPlacesState } from '../api/queries';

// TODO(post): "찾는 장소가 없으신가요? 직접 추가" 배너만 잠시 숨긴다(기획 요청,
// 2026-07-30) — 장소 목록·클릭 이동은 그대로 노출한다. 되돌리려면 아래 플래그를
// true로 바꾼다. 관련해서 skip 해둔 테스트는 PostDetailPage.test.tsx 상단 주석 참고.
const SHOW_DIRECT_ADD_BANNER = false;

export interface RelatedPlacesSectionProps {
  state: RelatedPlacesState;
  /** "직접 추가"로 사용자가 확정한 장소 — 파싱 상태(로딩/성공/실패)와 무관하게 항상 보여준다. */
  manualPlaces: Place[];
  bookmarkedPlaceIds: string[];
  onBookmarkedChange: (placeId: string, next: boolean) => void;
  onDirectAddClick: () => void;
  /** 장소 행을 누르면 그 장소 id 로 호출된다 — 지도 화면의 선택된 장소 뷰로 넘길 때 쓴다. */
  onPlaceClick?: (placeId: string) => void;
}

/**
 * Figma `연관 장소`(화면 문구는 "게시물에 포함된 장소") — 파싱 API 의 로딩/성공/실패에
 * 따라 달라지는 섹션.
 * 로딩 중엔 안내 문구만 보여주고, 로딩이 끝나면(성공/실패 모두) 장소 목록(있으면)을
 * 보여준다. "찾는 장소가 없으신가요? 직접 추가" 배너는 `SHOW_DIRECT_ADD_BANNER` 가
 * true 일 때만 함께 보여준다(현재는 잠시 숨김, 위 TODO 참고).
 * 사용자가 직접 추가로 확정한 장소(`manualPlaces`)는 파싱 상태와 무관하게 항상 목록에
 * 포함된다 — 파싱이 실패했어도 방금 직접 추가한 장소는 바로 보여야 하기 때문이다.
 * 실패했다는 사실 자체를 알리는 스낵바는 상위(PostDetailPage)책임이다 — 이 섹션은 배너만 그린다.
 */
function RelatedPlacesSection({
  state,
  manualPlaces,
  bookmarkedPlaceIds,
  onBookmarkedChange,
  onDirectAddClick,
  onPlaceClick,
}: RelatedPlacesSectionProps) {
  const deletion = usePlaceDeletion();
  const parsedPlaces = state.status === 'success' ? state.places : [];
  const places = [...parsedPlaces, ...manualPlaces].filter(
    (place) => !deletion.deletedPlaceIds.includes(place.id),
  );

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

        {SHOW_DIRECT_ADD_BANNER && state.status !== 'loading' ? (
          <button
            type="button"
            onClick={onDirectAddClick}
            className="flex w-full items-center justify-between rounded-sm bg-gray-0 px-1 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100"
          >
            <span className="flex items-center gap-2">
              <Icon16ExclamationCircle />
              <span className="text-b2 font-medium text-gray-80">찾는 장소가 없으신가요? </span>
            </span>
            <span className="shrink-0 text-b3 font-semibold text-gray-90">직접 추가</span>
          </button>
        ) : null}
      </section>

      <PlaceDeletePopup deletion={deletion} />
    </>
  );
}

export { RelatedPlacesSection };
