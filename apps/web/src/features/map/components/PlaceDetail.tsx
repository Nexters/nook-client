import { useEffect, useRef, useState } from 'react';
import {
  ClockIcon,
  ExternalLinkIcon,
  LocationPinIcon,
  PenIcon,
  StarOnIcon,
} from '@/features/map/components/icons';
import { getDistanceKm, type MockPlace } from '@/features/map/mock/places';
import { Badge } from '@/shared/ui';

/** 상세 화면에 보여줄 연관 장소 최대 개수 (Figma 시안 기준 3개). */
const MAX_RELATED_PLACES = 3;

/**
 * 메모 표시/편집 행. "수정"을 누르면 인풋으로 바뀌고 "저장"을 누르면(또는 Enter)
 * 로컬 상태에만 값을 반영한다 — 메모 저장 API 가 아직 없어 실제로 어디에 영속화하진
 * 않는다. API 가 생기면 onSubmit 안에서 요청을 보내면 된다.
 */
function MemoRow({ initialMemo }: { initialMemo: string | null }) {
  const [memo, setMemo] = useState(initialMemo);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(initialMemo ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  if (isEditing) {
    return (
      <form
        className="flex h-6 items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setMemo(draft);
          setIsEditing(false);
          // TODO: 메모 저장 API 연동 시 여기서 요청을 보낸다.
        }}
      >
        <PenIcon className="size-4 shrink-0 text-gray-40" />
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="메모를 남겨보세요"
          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-b2 text-gray-80 outline-none"
        />
        <button type="submit" className="shrink-0 text-b2 text-blue">
          저장
        </button>
      </form>
    );
  }

  return (
    <div className="flex h-6 items-center gap-2">
      <PenIcon className="size-4 shrink-0 text-gray-40" />
      <p className="min-w-0 flex-1 truncate text-b2 text-gray-80">
        {memo && memo.length > 0 ? memo : '메모를 남겨보세요.'}
      </p>
      <button
        type="button"
        onClick={() => {
          setDraft(memo ?? '');
          setIsEditing(true);
        }}
        className="shrink-0 text-b2 text-blue"
      >
        수정
      </button>
    </div>
  );
}

function SavedPostsSection({ place }: { place: MockPlace }) {
  if (place.savedPosts.length === 0) return null;

  return (
    <div className="flex w-full flex-col gap-3 border-t border-gray-10 pt-4">
      <p className="text-b1 font-semibold text-gray-100">저장된 게시물</p>
      <div className="flex gap-2 overflow-x-auto">
        {place.savedPosts.map((post) => (
          // 실제 게시물 사진 API 연동 전까지 회색 박스로 대체
          <div
            key={post.id}
            className="h-[175px] w-[140px] shrink-0 rounded-sm border border-gray-20 bg-gray-10"
          />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {place.savedPosts.map((post) => (
          <p key={post.id} className="text-b2 text-gray-80">
            {post.excerpt} <span className="text-gray-50">{post.author}</span>
          </p>
        ))}
      </div>
      <div className="flex h-11 items-center justify-between rounded-sm bg-gray-10 px-4 py-2.5">
        <p className="text-b2 text-gray-80">@nook.official on instagram</p>
        <ExternalLinkIcon className="size-4 text-gray-60" />
      </div>
    </div>
  );
}

function RelatedPlaceRow({
  place,
  distanceKm,
  onClick,
}: {
  place: MockPlace;
  distanceKm: number;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-4">
      {/* 실제 업체 사진 API 연동 전까지 회색 박스로 대체 */}
      <div className="size-16 shrink-0 rounded-sm border border-gray-20 bg-gray-10" />
      <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
        <p className="text-b2 font-semibold text-gray-90">{place.name}</p>
        <div className="flex flex-col items-start">
          <p className="flex items-center gap-1 text-b3 text-gray-70">
            <span>{place.category}</span>
            <span aria-hidden="true">•</span>
            <span>{distanceKm}km</span>
          </p>
          <p className="truncate text-b3 text-gray-60">{place.address}</p>
        </div>
      </div>
      {/* 이 목록의 모든 장소는 지도 화면의 "저장한 공간" 데이터라 항상 저장됨 상태다. */}
      <StarOnIcon className="size-8 shrink-0" />
    </button>
  );
}

function RelatedPlacesSection({
  place,
  places,
  onSelectPlace,
}: {
  place: MockPlace;
  places: MockPlace[];
  onSelectPlace: (id: string) => void;
}) {
  const relatedPlaces = places
    .filter((candidate) => candidate.id !== place.id)
    .map((candidate) => ({ place: candidate, distanceKm: getDistanceKm(place, candidate) }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, MAX_RELATED_PLACES);

  if (relatedPlaces.length === 0) return null;

  return (
    <div className="flex w-full flex-col gap-4 border-t border-gray-10 pt-4">
      <p className="text-b1 font-semibold text-gray-100">연관 장소</p>
      <div className="flex flex-col gap-4">
        {relatedPlaces.map(({ place: relatedPlace, distanceKm }) => (
          <RelatedPlaceRow
            key={relatedPlace.id}
            place={relatedPlace}
            distanceKm={distanceKm}
            onClick={() => onSelectPlace(relatedPlace.id)}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * 지도 핀 클릭 시 드로어에 보여줄 장소 상세.
 * `expanded`(full 스냅) 일 때만 영업정보/메모/저장된 게시물/연관 장소를 추가로 보여준다
 * — mid 스냅에서는 이름·위치·태그·대표 사진까지만 노출한다(Figma 14:1483/14:1902/14:1664 차이).
 */
export function PlaceDetail({
  place,
  places,
  expanded,
  onSelectPlace,
}: {
  place: MockPlace;
  places: MockPlace[];
  expanded: boolean;
  onSelectPlace: (id: string) => void;
}) {
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex w-full flex-col gap-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-h1 text-gray-100">{place.name}</p>
            <p className="text-b2 text-gray-80">{place.category}</p>
          </div>
          {/* 즐겨찾기 off 상태 시안이 아직 없어 정적 표시만 한다. */}
          <button type="button" aria-label="저장됨" className="shrink-0">
            <StarOnIcon className="size-8" />
          </button>
        </div>
        <p className="text-b2 text-gray-70">{place.address}</p>
        <div className="flex flex-wrap gap-1.5 py-2">
          {place.tags.map((tag) => (
            <Badge key={tag} variant="keyword">
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* 실제 업체 사진 API 연동 전까지 회색 박스로 대체 */}
      <div className="h-[212px] w-full rounded-sm border border-gray-20 bg-gray-10" />

      {expanded && (
        <>
          <div className="flex w-full flex-col gap-1">
            <div className="flex h-6 items-center gap-2">
              <LocationPinIcon className="size-4 text-gray-40" />
              <p className="text-b2 text-gray-80">{place.address}</p>
            </div>
            <div className="flex h-6 items-center gap-2">
              <ClockIcon className="size-4 text-gray-40" />
              <p className="text-b2 text-gray-80">
                영업중 <span aria-hidden="true">•</span> {place.hours}
              </p>
            </div>
            <MemoRow key={place.id} initialMemo={place.memo} />
          </div>

          <SavedPostsSection place={place} />
          <RelatedPlacesSection place={place} places={places} onSelectPlace={onSelectPlace} />
        </>
      )}
    </div>
  );
}
