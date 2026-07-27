import { useState } from 'react';
import { getDistanceKm, type MockPlace } from '@/features/map/mock/places';
import type { Place as DesignPlace } from '@/features/place';
import { PlaceInfo, PlaceRow } from '@/features/place';
import type { Post } from '@/features/post';
import { SavedPostCard } from '@/features/post';
import { Icon32StarOn } from '@/shared/icons/NookIcons';
import { Badge } from '@/shared/ui';

/** 상세 화면에 보여줄 연관 장소 최대 개수 (Figma 시안 기준 3개). */
const MAX_RELATED_PLACES = 3;

/**
 * 지점 정보/저장된 게시물/연관 장소 섹션 사이 구분선(Figma 14:1873).
 * 얇은 border 가 아니라 6px 두께의 회색 띠다 — 부모의 좌우 padding(px-4)과
 * 위아래 gap(gap-3, 12px)을 상쇄해서 정확히 6px만 차지하는 풀블리드 바로 만든다.
 */
function SectionDivider() {
  return <div className="-mx-4 -my-3 h-1.5 shrink-0 bg-gray-10" />;
}

function SavedPostsSection({ place }: { place: MockPlace }) {
  if (place.savedPosts.length === 0) return null;

  return (
    <>
      <SectionDivider />
      <div className="flex w-full flex-col">
        {place.savedPosts.map((savedPost) => {
          const post: Post = {
            id: savedPost.id,
            authorHandle: savedPost.authorHandle,
            sharedBy: savedPost.author,
            caption: savedPost.excerpt,
            images: savedPost.images,
            originalUrl: savedPost.originalUrl,
          };
          return (
            <SavedPostCard
              key={savedPost.id}
              post={post}
              groupName={place.category}
              groupColor={place.color}
            />
          );
        })}
      </div>
    </>
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
    <>
      <SectionDivider />
      <div className="flex w-full flex-col gap-4 mt-4">
        <p className="text-b1 font-semibold text-gray-100">연관 장소</p>
        <div className="flex flex-col gap-4">
          {relatedPlaces.map(({ place: relatedPlace, distanceKm }) => {
            const rowPlace: DesignPlace = {
              id: relatedPlace.id,
              name: relatedPlace.name,
              category: relatedPlace.category,
              distance: `${distanceKm}km`,
              address: relatedPlace.address,
            };
            return (
              <PlaceRow
                key={relatedPlace.id}
                place={rowPlace}
                onClick={() => onSelectPlace(relatedPlace.id)}
              />
            );
          })}
        </div>
      </div>
    </>
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
  // 메모 저장 API 가 아직 없어 로컬 상태에만 반영한다. 값을 바꾸면 여기서 API 를 호출한다.
  const [memo, setMemo] = useState(place.memo);

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
            <Icon32StarOn />
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
          <PlaceInfo
            address={place.address}
            businessStatus="영업중"
            businessHours={place.hours}
            memo={memo}
            onMemoChange={setMemo}
            className="mb-4"
          />

          <SavedPostsSection place={place} />
          <RelatedPlacesSection place={place} places={places} onSelectPlace={onSelectPlace} />
        </>
      )}
    </div>
  );
}
