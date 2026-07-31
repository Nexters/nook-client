import { useQueries } from '@tanstack/react-query';
import type { PlaceDetail as PlaceDetailModel, PlaceDetailPost } from '@/features/map/types';
import { PlaceInfo, PlaceRow } from '@/features/place';
import type { Post } from '@/features/post';
import { SavedPostCard } from '@/features/post';
import { fetchPostDetail, formatAuthorHandle } from '@/features/post/api';
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
function usePostDetails(posts: PlaceDetailPost[]) {
  return useQueries({
    queries: posts.map((post) => ({
      queryKey: postQueryKeys.detail(post.id),
      queryFn: () => fetchPostDetail(post.id),
    })),
  });
}

function SavedPostsSection({ posts }: { posts: PlaceDetailPost[] }) {
  const postDetailQueries = usePostDetails(posts);

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
                authorHandle: formatAuthorHandle(placePost.authorHandle),
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

/**
 * "연관 장소" — 게시물 상세 페이지의 같은 이름 섹션과 같은 내용이다.
 * `GET /places/{placeId}`(장소 상세)엔 연관 장소가 없지만, 이 장소에 저장된 게시물의
 * 상세(`GET /posts/{postId}`, 위 `SavedPostsSection`이 이미 쓰는 그 응답)에 파싱된
 * 장소 목록이 들어 있다 — 그 장소들에서 지금 보고 있는 장소만 빼고 보여준다.
 */
function RelatedPlacesSection({
  place,
  onSelectPlace,
}: {
  place: PlaceDetailModel;
  onSelectPlace?: (placeId: number) => void;
}) {
  // 위 섹션과 같은 쿼리 키라 요청은 한 번만 나간다(캐시 공유).
  const postDetailQueries = usePostDetails(place.posts);
  const updateBookmark = useUpdatePlaceBookmark();

  // 여러 게시물이 같은 장소를 가리킬 수 있어 id 로 중복을 제거한다.
  const relatedPlaces = [
    ...new Map(
      postDetailQueries
        .flatMap((query) => query.data?.places ?? [])
        .filter((related) => related.id !== place.id)
        .map((related) => [related.id, related]),
    ).values(),
  ];

  if (relatedPlaces.length === 0) return null;

  return (
    <>
      <SectionDivider />
      <div className="mt-4 flex w-full flex-col gap-4 pb-2">
        <p className="text-b1 font-semibold text-gray-100">연관 장소</p>
        <div className="flex flex-col gap-4">
          {relatedPlaces.map((related) => (
            <PlaceRow
              key={related.id}
              place={{
                id: String(related.id),
                name: related.name,
                category: related.category ?? '',
                address: related.address,
              }}
              bookmarked={related.bookmarked}
              onBookmarkedChange={(next) =>
                updateBookmark.mutate({ placeId: related.id, bookmarked: next })
              }
              // 같은 지도 화면 안에서 선택 장소만 바뀌므로 라우팅은 필요 없다.
              onClick={onSelectPlace ? () => onSelectPlace(related.id) : undefined}
            />
          ))}
        </div>
      </div>
    </>
  );
}

/**
 * 지도 핀 클릭 시 드로어에 보여줄 장소 상세.
 * `expanded`(full 스냅) 일 때만 주소/저장된 게시물/연관 장소를 추가로 보여준다
 * — mid 스냅에서는 이름·위치·대표 사진까지만 노출한다(Figma 14:1483/14:1902/14:1664 차이).
 *
 * 서버 응답(`PlaceDetailResponse`)엔 영업시간/태그/장소 메모가 없어 목데이터 시절과
 * 달리 이 정보들은 아예 보여주지 않는다 — 실제로 없는 값을 지어내지 않는다.
 */
export function PlaceDetail({
  place,
  expanded,
  onSelectPlace,
}: {
  place: PlaceDetailModel;
  expanded: boolean;
  /** 연관 장소 행을 눌렀을 때 그 장소로 선택을 옮긴다. */
  onSelectPlace?: (placeId: number) => void;
}) {
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
        {/* 꽉 찬 스냅에서는 아래 `PlaceInfo` 가 같은 주소를 보여줘서 여기선 뺀다. */}
        {!expanded && <p className="text-b2 text-gray-70">{place.address}</p>}
      </div>

      {/* 실제 업체 사진 API 연동 전까지 회색 박스로 대체 */}
      <div className="h-[212px] w-full rounded-sm border border-gray-20 bg-gray-10" />

      {expanded && (
        <>
          <PlaceInfo address={place.address} className="mb-4" />

          <SavedPostsSection posts={place.posts} />
          <RelatedPlacesSection place={place} onSelectPlace={onSelectPlace} />
        </>
      )}
    </div>
  );
}
