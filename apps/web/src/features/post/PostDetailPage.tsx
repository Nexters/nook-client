import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useHideBottomMenu } from '@/app/bottom-menu-visibility';
import type { Place } from '@/features/place';
import { cn } from '@/shared/lib/utils';
import { BackButton, Carousel, Header, Snackbar } from '@/shared/ui';
import {
  usePostDetail,
  useRelatedPlaces,
  useUpdatePlaceBookmark,
  useUpdatePostMemo,
} from './api/queries';
import { MemoSheet } from './components/MemoSheet';
import { OriginalPostLink } from './components/OriginalPostLink';
import { PlaceDirectInputDrawer } from './components/PlaceDirectInputDrawer';
import { PostImageViewer } from './components/PostImageViewer';
import { PostInfo } from './components/PostInfo';
import { RelatedPlacesSection } from './components/RelatedPlacesSection';

/**
 * Figma `그룹 > 게시물 상세` (연관 장소 O / X, 메모 최대글자수, 이미지 확대 뷰)
 * + `메모하기` 바텀시트.
 *
 * 이미지 확대 뷰와 메모 시트는 별도 라우트가 아니라 이 화면 위에 얹는 레이어라
 * 열림 상태를 여기서 소유한다.
 */
export function PostDetailPage() {
  // 라우트 파라미터는 항상 string, 서버는 number — 경계 변환은 여기 한 곳에서만 한다.
  const { postId: postIdParam } = useParams();
  const postId = postIdParam ? Number(postIdParam) : undefined;
  const navigate = useNavigate();
  useHideBottomMenu();

  const postDetailState = usePostDetail(postId);
  const updateMemoMutation = useUpdatePostMemo(postId);
  const [memoOpen, setMemoOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const relatedPlacesState = useRelatedPlaces(postId);
  const [directInputOpen, setDirectInputOpen] = useState(false);
  const [showRelatedPlacesErrorToast, setShowRelatedPlacesErrorToast] = useState(false);

  // "직접 추가"로 확정한 장소 — 파싱 상태와 무관하게 항상 연관 장소에 보여준다.
  const [manualPlaces, setManualPlaces] = useState<Place[]>([]);

  // 직접 추가한 장소 전용 로컬 북마크 상태. 파싱된 장소는 서버 상태
  // (`bookmarkedPlaceIds` + 토글 시 북마크 API)를 따르지만, 직접 추가 장소는 아직
  // 서버에 연결(connectPlace)되지 않은 목 검색 결과라(id 가 'search-1' 등 가짜) 북마크
  // API 를 부를 수 없다 — TODO(api): 장소 직접 연결 연동 때 이 상태도 함께 걷어낸다.
  const [bookmarkOverrides, setBookmarkOverrides] = useState<Record<string, boolean>>({});
  const updateBookmarkMutation = useUpdatePlaceBookmark(postId);

  const toggleBookmark = (placeId: string, next: boolean) => {
    if (manualPlaces.some((place) => place.id === placeId)) {
      setBookmarkOverrides((prev) => ({ ...prev, [placeId]: next }));
      return;
    }
    updateBookmarkMutation.mutate({ placeId: Number(placeId), bookmarked: next });
  };

  // 직접 추가한 장소(가짜 id, 예: 'search-1')는 아직 지도 쪽 실제 장소와 연결돼 있지
  // 않으니 이동하지 않는다 — 파싱된 실제 장소(숫자 id)만 지도의 선택된 장소 뷰로 넘긴다.
  function handleRelatedPlaceClick(placeId: string) {
    const numericPlaceId = Number(placeId);
    if (!Number.isFinite(numericPlaceId)) return;
    navigate(`/map?placeId=${numericPlaceId}`);
  }

  function handlePlaceConfirmed(place: Place) {
    // TODO(api): 장소 연결은 실제로는 서버에 저장해야 한다. 지금은 화면 상태(manualPlaces)만 갱신해 새로고침/재방문 시 사라진다.
    setManualPlaces((prev) =>
      prev.some((existing) => existing.id === place.id) ? prev : [...prev, place],
    );
    // 시안: 직접 추가한 장소는 항상 파란 북마크(저장됨) 상태로 시작한다.
    setBookmarkOverrides((prev) => ({ ...prev, [place.id]: true }));
    setDirectInputOpen(false);
  }

  const allPlaceIds = [
    ...(relatedPlacesState.status === 'success'
      ? relatedPlacesState.places.map((place) => place.id)
      : []),
    ...manualPlaces.map((place) => place.id),
  ];

  const bookmarkedPlaceIds = allPlaceIds.filter(
    (id) =>
      bookmarkOverrides[id] ??
      (relatedPlacesState.status === 'success' &&
        relatedPlacesState.bookmarkedPlaceIds.includes(id)),
  );

  useEffect(() => {
    if (relatedPlacesState.status !== 'error') return;
    setShowRelatedPlacesErrorToast(true);
    const timer = setTimeout(() => setShowRelatedPlacesErrorToast(false), 3000);
    return () => clearTimeout(timer);
  }, [relatedPlacesState.status]);

  if (postDetailState.status !== 'success') {
    return (
      <main className="min-h-dvh bg-gray-0" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <Header left={<BackButton />} />
        <p className="px-4 pt-20 text-center text-b2 font-medium text-gray-60">
          {postDetailState.status === 'loading' ? '불러오는 중…' : '게시물을 찾을 수 없어요'}
        </p>
      </main>
    );
  }

  const { post, title, groups, memo } = postDetailState.detail;
  const images = post.images ?? [];

  return (
    <main
      className="flex h-dvh flex-col overflow-hidden bg-gray-0"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div
        className="min-h-0 flex-1 overflow-y-auto"
        style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
      >
        <Header left={<BackButton />} />

        {images.length > 0 ? (
          <Carousel>
            {images.map((src, index) => (
              <button
                // 이미지 URL 은 중복될 수 있고 순서가 고정이라 위치를 key 로 쓴다.
                // biome-ignore lint/suspicious/noArrayIndexKey: 고정 순서 목록
                key={index}
                type="button"
                aria-label={`${index + 1}번째 이미지 크게 보기`}
                onClick={() => setViewerOpen(true)}
                // 좌우 16px 여백은 첫/마지막 슬라이드가 만든다 — 스크롤 컨테이너에 padding 을
                // 주면 다음 이미지가 화면 끝까지 이어지지 않고 잘린다(시안은 끝까지 이어진다).
                className={cn(
                  'h-[300px] w-[281px] overflow-hidden rounded-sm',
                  index === 0 && 'ml-4',
                  index === images.length - 1 && 'mr-4',
                )}
              >
                <img src={src} alt="" className="size-full object-cover" />
              </button>
            ))}
          </Carousel>
        ) : null}

        <div className="flex flex-col gap-2 px-4 pt-1">
          <h1 className="text-h2 font-semibold text-gray-100">{title}</h1>

          {post.caption ? (
            <div className="flex flex-col">
              <p
                className={cn(
                  'whitespace-pre-wrap text-b2 font-normal text-gray-80',
                  expanded ? '' : 'line-clamp-1',
                )}
              >
                {post.caption}
              </p>
              <button
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
                className="self-start text-b2 font-medium text-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100"
              >
                {expanded ? '접기' : '더보기'}
              </button>
            </div>
          ) : null}

          <PostInfo
            groups={groups}
            memo={memo}
            onMemoEdit={() => setMemoOpen(true)}
            className="pt-2"
          />

          {post.originalUrl ? (
            <OriginalPostLink label={post.authorHandle} href={post.originalUrl} className="mt-2" />
          ) : null}
        </div>

        <RelatedPlacesSection
          state={relatedPlacesState}
          manualPlaces={manualPlaces}
          bookmarkedPlaceIds={bookmarkedPlaceIds}
          onBookmarkedChange={toggleBookmark}
          onDirectAddClick={() => setDirectInputOpen(true)}
          onPlaceClick={handleRelatedPlaceClick}
        />
      </div>

      <MemoSheet
        open={memoOpen}
        onOpenChange={setMemoOpen}
        memo={memo}
        onSave={(next) => updateMemoMutation.mutate(next)}
      />

      {viewerOpen ? <PostImageViewer images={images} onClose={() => setViewerOpen(false)} /> : null}

      <PlaceDirectInputDrawer
        open={directInputOpen}
        onOpenChange={setDirectInputOpen}
        onPlaceConfirmed={handlePlaceConfirmed}
      />

      {showRelatedPlacesErrorToast ? (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <Snackbar
            title="위치를 찾지 못 했어요"
            description="게시물은 저장됐지만 지도에는 표시되지 않아요"
            className="w-full max-w-[343px]"
          />
        </div>
      ) : null}
    </main>
  );
}
