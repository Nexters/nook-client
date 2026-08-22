import { useQueries } from '@tanstack/react-query';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { PlaceActions } from '@/features/map/components/PlaceActions';
import { toDisplayPost } from '@/features/map/lib/placePost';
import type { PlaceDetail as PlaceDetailModel, PlaceDetailPost } from '@/features/map/types';
import {
  PlaceDeletePopup,
  PlaceInfo,
  PlacePhotos,
  PlacePhotoViewer,
  PlaceRow,
} from '@/features/place';
import { buildNaverMapSearchUrl } from '@/features/place/lib/naverMapLink';
import { formatBusinessHours, formatBusinessStatus } from '@/features/place/lib/opening-hours';
import { usePlaceDeletion } from '@/features/place/lib/usePlaceDeletion';
import { MemoSheet, SavedPostCard, SavedPostViewer } from '@/features/post';
import { fetchPostDetail, formatAuthorHandle } from '@/features/post/api';
import { postQueryKeys } from '@/features/post/api/queries';
import type { PostDetail } from '@/features/post/types';
import { fetchSharedPostDetail } from '@/features/share/api';
import { sharedQueryKeys } from '@/features/share/api/queries';
import { Icon16ArrowRight, Icon20Images } from '@/shared/icons/NookIcons';
import { type Coordinates, formatDistance } from '@/shared/lib/geolocation';
import { cn } from '@/shared/lib/utils';
import { useToast } from '@/shared/toast';
import { Badge, Carousel, Thumbnail } from '@/shared/ui';
import {
  useDisconnectPlaceFromPosts,
  useUpdatePlaceBookmark,
  useUpdatePlaceMemo,
} from '../api/queries';

/**
 * 지점 정보/저장된 게시물/게시물에 포함된 장소 섹션 사이 구분선(Figma 14:1873).
 * 얇은 border 가 아니라 6px 두께의 회색 띠다 — 부모의 좌우 padding(px-4)과
 * 위아래 gap(gap-3, 12px)을 상쇄해서 정확히 6px만 차지하는 풀블리드 바로 만든다.
 */
function SectionDivider() {
  return <div className="-mx-4 -my-3 h-1.5 shrink-0 bg-gray-10" />;
}

/**
 * 이 장소에 연결된 저장 게시물 — 목데이터 시절과 같은 `SavedPostCard` 를 그대로 쓴다.
 *
 * `PlacePostResponse`(장소 상세 응답)는 제목·작성자·대표 이미지 1장까지만 준다 —
 * 본문 전체·이미지 전체·원본 링크·아카이브는 없다. 그 값들은 이미 게시물 상세가 갖고 있으므로
 * (`GET /posts/{postId}`) postId 로 병렬 추가 조회해서 채운다. `postQueryKeys.detail` 을
 * 그대로 재사용해 게시물 상세 페이지와 캐시를 공유한다 — 여기서 한 번 로드해두면 그
 * 게시물 상세로 들어갔을 때 재요청 없이 바로 뜬다(반대 방향도 마찬가지).
 * 상세가 오기 전(또는 아직 없음)엔 장소 상세 응답의 얇은 정보로 채운 카드를 우선 보여준다
 * (아카이브 태그는 상세가 올 때까지 비어 있다).
 *
 * 공유 아카이브 딥링크(`shareToken` 동반 진입)로 들어온 경우엔 항상 공유 토큰 스코프의
 * 공개 API 로 조회한다 — 공유 링크로 들어온 화면은 (이미 저장해 둔 장소·게시물이라도)
 * 공유자 기준 읽기 전용으로 보여주는 게 정책이다. 그래서 캐시 키도 내 게시물 상세
 * (`postQueryKeys.detail`, `PostDetailPage` 와 공유)와는 분리해 서로 덮어쓰지 않게 하고,
 * 대신 `SharedPostDetailPage` 와 같은 키(`sharedQueryKeys.postDetail`)를 써서 캐시를 나눠 쓴다.
 */
function usePostDetails(posts: PlaceDetailPost[], shareToken?: string | null) {
  return useQueries({
    queries: posts.map((post) => ({
      queryKey: shareToken
        ? sharedQueryKeys.postDetail(shareToken, post.id)
        : postQueryKeys.detail(post.id),
      queryFn: () =>
        shareToken ? fetchSharedPostDetail(shareToken, post.id) : fetchPostDetail(post.id),
    })),
  });
}

function SavedPostTile({
  post,
  detail,
  onClick,
}: {
  post: PlaceDetailPost;
  detail?: PostDetail;
  onClick: () => void;
}) {
  const imageCount = detail?.post.images?.length ?? 0;
  // 장소 수는 게시물 상세에만 있다 — 아직 안 왔으면 "0 Places" 대신 계정만 보여준다.
  const subtitle = [
    formatAuthorHandle(post.authorHandle),
    detail ? `${detail.places.length} Places` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-42 flex-col gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100"
    >
      <div className="relative w-full">
        <Thumbnail src={post.thumbnail} className="aspect-[167/208] h-auto w-full" />
        {imageCount > 1 ? <Icon20Images className="absolute top-2 right-2" /> : null}
      </div>
      <div className="flex w-full flex-col">
        <p className="truncate text-b3 font-semibold text-gray-90">{post.title}</p>
        <p className="truncate font-mono text-e2 text-gray-60">{subtitle}</p>
      </div>
    </button>
  );
}

function SavedPostsSection({
  place,
  shareToken,
}: {
  place: PlaceDetailModel;
  shareToken?: string | null;
}) {
  const posts = place.posts;
  const postDetailQueries = usePostDetails(posts, shareToken);
  const navigate = useNavigate();
  // 미디어를 누르면 열리는 확대뷰 — 어느 카드의 몇 번째 미디어인지 함께 들고 있어야
  // 그 미디어부터 시작할 수 있다.
  const [viewing, setViewing] = useState<{ postIndex: number; mediaIndex: number } | null>(null);

  if (posts.length === 0) return null;

  const detailAt = (index: number) => postDetailQueries[index]?.data;
  const viewingPost = viewing ? posts[viewing.postIndex] : undefined;
  const viewingDetail = viewing ? detailAt(viewing.postIndex) : undefined;
  // 모아보기 페이지는 내 API 만 쓴다 — 공유 링크로 들어온(아직 저장 안 한) 장소는 그쪽에서
  // 404 가 난다. 그래서 공유 진입일 땐 넘기지 않고 예전처럼 카드를 전부 펼친다.
  const expandAll = Boolean(shareToken) || posts.length === 1;

  return (
    <>
      <SectionDivider />
      {expandAll ? (
        <div className="flex w-full flex-col">
          {posts.map((post, index) => (
            <SavedPostCard
              key={post.id}
              post={toDisplayPost(post, detailAt(index))}
              archives={detailAt(index)?.archives ?? []}
              onArchiveClick={(archiveId) => navigate(`/archive/${archiveId}`)}
              onMediaClick={(mediaIndex) => setViewing({ postIndex: index, mediaIndex })}
            />
          ))}
        </div>
      ) : (
        <div className="flex w-full flex-col">
          <button
            type="button"
            onClick={() => navigate(`/place/${place.id}/posts`)}
            className="flex items-center gap-1 self-start pt-4 pb-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100"
          >
            <span className="text-b1 font-semibold text-gray-100">저장된 게시물</span>
            <span className="text-b1 font-semibold text-nook-blue">{place.postsTotal}</span>
            <Icon16ArrowRight />
          </button>
          {/* 좌우 16px 밖으로 빼고 첫/마지막만 ml-4/mr-4 로 되돌린다(SavedPostCard 이미지 줄과 같다). */}
          <Carousel indicator={false} className="-mx-4 w-auto pb-3">
            {posts.map((post, index) => (
              <div
                key={post.id}
                className={cn(index === 0 && 'ml-4', index === posts.length - 1 && 'mr-4')}
              >
                <SavedPostTile
                  post={post}
                  detail={detailAt(index)}
                  onClick={() => navigate(`/post/${post.id}`)}
                />
              </div>
            ))}
          </Carousel>
        </div>
      )}

      {/* 장소 상세는 vaul 드로어(transform) 안이라 fixed 의 기준이 드로어가 된다 —
          `PlacePhotoViewer` 와 같은 이유로 body 로 포탈해 화면 전체를 덮는다. */}
      {viewingPost
        ? createPortal(
            <SavedPostViewer
              post={toDisplayPost(viewingPost, viewingDetail)}
              title={viewingDetail?.title ?? viewingPost.title}
              initialIndex={viewing?.mediaIndex}
              onClose={() => setViewing(null)}
            />,
            document.body,
          )
        : null}
    </>
  );
}

/**
 * "게시물에 포함된 장소" — 이름 그대로 이 장소에 저장된 게시물들이 가리키는 장소 목록이다.
 * `GET /places/{placeId}`(장소 상세)엔 이 목록이 없지만, 저장 게시물의 상세
 * (`GET /posts/{postId}`, 위 `SavedPostsSection`이 이미 쓰는 그 응답)에 파싱된 장소가
 * 들어 있다 — 그 장소들에서 지금 보고 있는 장소만 빼고 보여준다.
 */
function RelatedPlacesSection({
  place,
  shareToken,
  userCoords,
  onSelectPlace,
}: {
  place: PlaceDetailModel;
  shareToken?: string | null;
  userCoords?: Coordinates | null;
  onSelectPlace?: (placeId: number) => void;
}) {
  // 공유 링크로 들어온 화면은 공유자 기준 읽기 전용이다 — 북마크 토글·스와이프 삭제를
  // 아예 보여주지 않는다(내 소유가 아닌 장소·연결에 내 API 를 쓸 수 없다).
  const readOnly = Boolean(shareToken);
  // 위 섹션과 같은 쿼리 키라 요청은 한 번만 나간다(캐시 공유).
  const postDetailQueries = usePostDetails(place.posts, shareToken);
  const updateBookmark = useUpdatePlaceBookmark();
  const disconnectPlace = useDisconnectPlaceFromPosts();

  // 여러 게시물이 같은 장소를 가리킬 수 있어 id 로 중복을 제거한다. 삭제는 게시물↔장소
  // 연결을 끊는 것이라, 그 장소를 담고 있던 게시물이 어느 것들인지도 함께 들고 있어야 한다.
  const postIdsByPlaceId = new Map<number, number[]>();
  postDetailQueries.forEach((query, index) => {
    const postId = place.posts[index]?.id;
    if (postId === undefined) return;
    for (const related of query.data?.places ?? []) {
      postIdsByPlaceId.set(related.id, [...(postIdsByPlaceId.get(related.id) ?? []), postId]);
    }
  });

  const deletion = usePlaceDeletion({
    onDelete: (placeId) =>
      disconnectPlace.mutateAsync({
        placeId: Number(placeId),
        postIds: postIdsByPlaceId.get(Number(placeId)) ?? [],
      }),
  });

  const relatedPlaces = [
    ...new Map(
      postDetailQueries
        .flatMap((query) => query.data?.places ?? [])
        .filter((related) => related.id !== place.id)
        .map((related) => [related.id, related]),
    ).values(),
  ].filter((related) => !deletion.deletedPlaceIds.includes(String(related.id)));

  // 마지막 장소까지 지우면 섹션째 사라진다(연관 장소가 원래 없을 때와 같은 모습).
  if (relatedPlaces.length === 0) return null;

  return (
    <>
      <SectionDivider />
      <div className="mt-4 flex w-full flex-col gap-4 pb-2">
        <p className="text-b1 font-semibold text-gray-100">게시물에 포함된 장소</p>
        {/* 좌우 여백은 행이 갖는다(삭제 스와이프에서 여백째 밀려나가야 한다) — 시트의 px-4 를 상쇄한다. */}
        <div className="-mx-4 flex flex-col gap-4">
          {relatedPlaces.map((related) => (
            <PlaceRow
              key={related.id}
              place={{
                id: String(related.id),
                name: related.name,
                category: related.category ?? '',
                address: related.address,
                thumbnail: related.thumbnail,
                distance: userCoords
                  ? formatDistance(userCoords, { lat: related.latitude, lng: related.longitude })
                  : undefined,
              }}
              bookmarked={related.bookmarked}
              onBookmarkedChange={
                readOnly
                  ? undefined
                  : (next) => updateBookmark.mutate({ placeId: related.id, bookmarked: next })
              }
              // 같은 지도 화면 안에서 선택 장소만 바뀌므로 라우팅은 필요 없다.
              onClick={onSelectPlace ? () => onSelectPlace(related.id) : undefined}
              onDelete={
                readOnly
                  ? undefined
                  : () => deletion.requestDelete({ id: String(related.id), name: related.name })
              }
            />
          ))}
        </div>
      </div>

      <PlaceDeletePopup deletion={deletion} />
    </>
  );
}

/**
 * 지도 핀 클릭 시 드로어에 보여줄 장소 상세.
 * `expanded`(full 스냅) 일 때만 장소 info/저장된 게시물/게시물에 포함된 장소를 추가로 보여준다
 * — mid 스냅에서는 이름·태그·거리·주소·사진까지만 노출한다(Figma 126:13002 vs 126:13111).
 */
export function PlaceDetail({
  place,
  expanded,
  shareToken,
  userCoords,
  onClose,
  onSelectPlace,
}: {
  place: PlaceDetailModel;
  expanded: boolean;
  /**
   * 공유 아카이브 딥링크로 들어온 경우의 토큰. 있으면 상세를 공유자 기준 읽기 전용으로
   * 그린다 — 저장 토글·메모 편집·게시물에 포함된 장소의 북마크/스와이프 삭제를 숨긴다.
   */
  shareToken?: string | null;
  /** 현재 위치. 없으면(권한 거부 등) 거리 표기를 생략한다. */
  userCoords?: Coordinates | null;
  /** 헤더의 닫기 버튼 — 선택을 풀고 목록으로 되돌린다. */
  onClose: () => void;
  /** "게시물에 포함된 장소" 행을 눌렀을 때 그 장소로 선택을 옮긴다. */
  onSelectPlace?: (placeId: number) => void;
}) {
  const readOnly = Boolean(shareToken);
  const { showToast } = useToast();
  const [photosOpen, setPhotosOpen] = useState(false);
  const [memoOpen, setMemoOpen] = useState(false);
  const updateMemo = useUpdatePlaceMemo(place.id);

  const distance = userCoords
    ? formatDistance(userCoords, { lat: place.lat, lng: place.lng })
    : undefined;

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex w-full flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <p className="min-w-0 truncate text-h1 font-semibold text-gray-100">{place.name}</p>
            {place.category ? (
              <p className="shrink-0 text-b2 text-gray-80">{place.category}</p>
            ) : null}
          </div>
          <PlaceActions
            placeId={place.id}
            bookmarked={place.bookmarked}
            onClose={onClose}
            readOnly={readOnly}
          />
        </div>
        {/* 꽉 찬 스냅에서는 아래 `PlaceInfo` 가 같은 줄을 보여줘서 여기선 뺀다. */}
        {!expanded && (
          <p className="text-b2 text-gray-70">
            {distance ? `${distance} · ${place.address}` : place.address}
          </p>
        )}
        {place.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 py-2">
            {place.tags.map((tag) => (
              <Badge key={tag} variant="label">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <PlacePhotos
        photos={place.photos}
        onPhotoClick={place.photos.length > 0 ? () => setPhotosOpen(true) : undefined}
      />

      {expanded && (
        <>
          <PlaceInfo
            address={place.address}
            distance={distance}
            onAddressCopied={() =>
              showToast({ variant: 'simple', title: '클립보드에 복사되었습니다.' })
            }
            mapHref={buildNaverMapSearchUrl(place)}
            businessStatus={formatBusinessStatus(place.openNow)}
            businessHours={formatBusinessHours(place.openingHours)}
            memo={place.memo}
            onMemoEdit={readOnly ? undefined : () => setMemoOpen(true)}
            className="mb-4"
          />

          <SavedPostsSection place={place} shareToken={shareToken} />
          <RelatedPlacesSection
            place={place}
            shareToken={shareToken}
            userCoords={userCoords}
            onSelectPlace={onSelectPlace}
          />
        </>
      )}

      {photosOpen && (
        <PlacePhotoViewer
          title={place.name}
          photos={place.photos}
          onClose={() => setPhotosOpen(false)}
        />
      )}

      {/* 게시물 상세와 같은 `메모하기` 바텀시트를 그대로 쓴다 — 저장 대상만 장소 메모다.
          읽기 전용에서는 여는 트리거 자체가 없어 항상 닫힌 채로 둔다. */}
      {readOnly ? null : (
        <MemoSheet
          open={memoOpen}
          onOpenChange={setMemoOpen}
          memo={place.memo}
          onSave={(memo) => updateMemo.mutate(memo)}
        />
      )}
    </div>
  );
}
