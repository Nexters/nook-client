import { useQueries } from '@tanstack/react-query';
import type { PlaceDetail as PlaceDetailModel, PlaceDetailPost } from '@/features/map/types';
import { PlaceInfo } from '@/features/place';
import type { Post } from '@/features/post';
import { SavedPostCard } from '@/features/post';
import { fetchPostDetail } from '@/features/post/api';
import { postQueryKeys } from '@/features/post/api/queries';
import { Icon32StarOff, Icon32StarOn } from '@/shared/icons/NookIcons';
import { useUpdatePlaceBookmark } from '../api/queries';

/** 대표 이미지가 없는 게시물 카드에 쓰는 회색 플레이스홀더(140x175, gray-20). */
const SAVED_POST_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="140" height="175"><rect width="140" height="175" fill="#e4e6e9"/></svg>',
)}`;

/**
 * 지점 정보/저장된 게시물/연관 장소 섹션 사이 구분선(Figma 14:1873).
 * 얇은 border 가 아니라 6px 두께의 회색 띠다 — 부모의 좌우 padding(px-4)과
 * 위아래 gap(gap-3, 12px)을 상쇄해서 정확히 6px만 차지하는 풀블리드 바로 만든다.
 */
function SectionDivider() {
  return <div className="-mx-4 -my-3 h-1.5 shrink-0 bg-gray-10" />;
}

/**
 * 이 장소에 연결된 저장 게시물 — 목데이터 시절과 같은 `SavedPostCard` 를 그대로 쓴다.
 *
 * `PlacePostResponse`(장소 상세 응답)는 제목·작성자·대표 이미지 1장·메모까지만 준다 —
 * 본문 전체·이미지 전체·원본 링크·그룹은 없다. 그 값들은 이미 게시물 상세가 갖고 있으므로
 * (`GET /posts/{postId}`) postId 로 병렬 추가 조회해서 채운다. `postQueryKeys.detail` 을
 * 그대로 재사용해 게시물 상세 페이지와 캐시를 공유한다 — 여기서 한 번 로드해두면 그
 * 게시물 상세로 들어갔을 때 재요청 없이 바로 뜬다(반대 방향도 마찬가지).
 * 상세가 오기 전(또는 실패)엔 장소 상세 응답의 얇은 정보로 채운 카드를 우선 보여준다
 * (그룹 태그는 상세가 올 때까지 비어 있다).
 */
function SavedPostsSection({ posts }: { posts: PlaceDetailPost[] }) {
  const postDetailQueries = useQueries({
    queries: posts.map((post) => ({
      queryKey: postQueryKeys.detail(post.id),
      queryFn: () => fetchPostDetail(post.id),
    })),
  });

  if (posts.length === 0) return null;

  return (
    <>
      <SectionDivider />
      <div className="flex w-full flex-col">
        {posts.map((placePost, index) => {
          const detail = postDetailQueries[index]?.data;
          const post: Post = detail
            ? detail.post
            : {
                id: String(placePost.id),
                authorHandle: placePost.authorHandle ?? '',
                caption: placePost.memo,
                // 이미지는 대표 미디어 1장만 내려온다 — 없으면 회색 플레이스홀더로 채운다.
                images: [placePost.thumbnail ?? SAVED_POST_IMAGE],
              };
          return <SavedPostCard key={placePost.id} post={post} groups={detail?.groups ?? []} />;
        })}
      </div>
    </>
  );
}

// TODO(map): "연관 장소" 섹션은 잠시 숨긴다 — `GET /places/{placeId}`가 아직 연관 장소를
// 내려주지 않아(연관 게시물만 내려준다) 전량 목데이터였다(실제 장소 id 체계와 무관해
// 클릭 동작도 없었다). 백엔드에 필드 추가되면 아래 주석을 걷어내고 실제 데이터로 교체한다.
// 되살릴 때 장소 행 클릭은 `PlaceRow`의 `onClick`으로 받아서, `PlaceSheet`가 이미 갖고
// 있는 `onSelectPlace`(MapPage.handlePlaceClick과 동일)를 그대로 이 컴포넌트까지
// 내려 호출하면 된다 — 같은 지도 화면 안에서 선택 장소만 바뀌므로 라우팅은 필요 없다.
//
// function RelatedPlacesSection({ place }: { place: PlaceDetailModel }) {
//   const center = { lat: place.lat, lng: place.lng };
//   const relatedPlaces = getMockPlaces(center)
//     .map((candidate) => ({ place: candidate, distanceKm: getDistanceKm(center, candidate) }))
//     .sort((a, b) => a.distanceKm - b.distanceKm)
//     .slice(0, MAX_RELATED_PLACES);
//
//   if (relatedPlaces.length === 0) return null;
//
//   return (
//     <>
//       <SectionDivider />
//       <div className="flex w-full flex-col gap-4 mt-4">
//         <p className="text-b1 font-semibold text-gray-100">연관 장소</p>
//         <div className="flex flex-col gap-4">
//           {relatedPlaces.map(({ place: relatedPlace, distanceKm }) => (
//             <PlaceRow
//               key={relatedPlace.id}
//               place={{
//                 id: relatedPlace.id,
//                 name: relatedPlace.name,
//                 category: relatedPlace.category,
//                 distance: `${distanceKm}km`,
//                 address: relatedPlace.address,
//               }}
//             />
//           ))}
//         </div>
//       </div>
//     </>
//   );
// }

/**
 * 지도 핀 클릭 시 드로어에 보여줄 장소 상세.
 * `expanded`(full 스냅) 일 때만 주소/저장된 게시물/연관 장소를 추가로 보여준다
 * — mid 스냅에서는 이름·위치·대표 사진까지만 노출한다(Figma 14:1483/14:1902/14:1664 차이).
 *
 * 서버 응답(`PlaceDetailResponse`)엔 영업시간/태그/장소 메모가 없어 목데이터 시절과
 * 달리 이 정보들은 아예 보여주지 않는다 — 실제로 없는 값을 지어내지 않는다.
 */
export function PlaceDetail({ place, expanded }: { place: PlaceDetailModel; expanded: boolean }) {
  const updateBookmark = useUpdatePlaceBookmark();

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex w-full flex-col gap-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-h1 text-gray-100">{place.name}</p>
            {place.category ? <p className="text-b2 text-gray-80">{place.category}</p> : null}
          </div>
          <button
            type="button"
            onClick={() =>
              updateBookmark.mutate({ placeId: place.id, bookmarked: !place.bookmarked })
            }
            disabled={updateBookmark.isPending}
            aria-pressed={place.bookmarked}
            aria-label={place.bookmarked ? '저장 취소' : '저장'}
            className="shrink-0"
          >
            {place.bookmarked ? <Icon32StarOn /> : <Icon32StarOff />}
          </button>
        </div>
        <p className="text-b2 text-gray-70">{place.address}</p>
      </div>

      {/* 실제 업체 사진 API 연동 전까지 회색 박스로 대체 */}
      <div className="h-[212px] w-full rounded-sm border border-gray-20 bg-gray-10" />

      {expanded && (
        <>
          <PlaceInfo address={place.address} className="mb-4" />

          <SavedPostsSection posts={place.posts} />
          {/* TODO(map): 연관 장소 섹션 잠시 숨김 — 위 `RelatedPlacesSection` 주석 참고 */}
        </>
      )}
    </div>
  );
}
