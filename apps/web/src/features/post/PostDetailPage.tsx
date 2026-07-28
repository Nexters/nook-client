import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useHideBottomMenu } from '@/app/bottom-menu-visibility';
import { cn } from '@/shared/lib/utils';
import { BackButton, Carousel, Header, Snackbar } from '@/shared/ui';
import { MemoSheet } from './components/MemoSheet';
import { OriginalPostLink } from './components/OriginalPostLink';
import { PlaceDirectInputDrawer } from './components/PlaceDirectInputDrawer';
import { PostImageViewer } from './components/PostImageViewer';
import { PostInfo } from './components/PostInfo';
import { RelatedPlacesSection } from './components/RelatedPlacesSection';
import { useRelatedPlaces } from './hooks/useRelatedPlaces';
// TODO(api): 게시물 상세 API 연동 시 목데이터 대신 TanStack Query 훅으로 교체한다.
import { getMockPostDetail } from './mock/posts';

/**
 * Figma `그룹 > 게시물 상세` (연관 장소 O / X, 메모 최대글자수, 이미지 확대 뷰)
 * + `메모하기` 바텀시트.
 *
 * 이미지 확대 뷰와 메모 시트는 별도 라우트가 아니라 이 화면 위에 얹는 레이어라
 * 열림 상태를 여기서 소유한다.
 */
export function PostDetailPage() {
  const { postId } = useParams();
  useHideBottomMenu();

  const detail = getMockPostDetail(postId);
  // TODO(api): 메모 저장은 PATCH 후 서버 값을 따르게 바꾼다. 지금은 화면 상태만 갱신한다.
  const [memo, setMemo] = useState(detail?.memo ?? '');
  const [memoOpen, setMemoOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const relatedPlacesState = useRelatedPlaces(postId);
  const [directInputOpen, setDirectInputOpen] = useState(false);
  const [showRelatedPlacesErrorToast, setShowRelatedPlacesErrorToast] = useState(false);

  // TODO(api): 즐겨찾기 토글은 북마크 API 연동 후 서버 상태를 따르게 바꾼다.
  // 파싱 응답의 bookmarked 초기값 위에 사용자가 토글한 값만 덮어쓴다.
  const [bookmarkOverrides, setBookmarkOverrides] = useState<Record<string, boolean>>({});

  const toggleBookmark = (placeId: string, next: boolean) =>
    setBookmarkOverrides((prev) => ({ ...prev, [placeId]: next }));

  const bookmarkedPlaceIds =
    relatedPlacesState.status === 'success'
      ? relatedPlacesState.places
          .map((place) => place.id)
          .filter(
            (id) => bookmarkOverrides[id] ?? relatedPlacesState.bookmarkedPlaceIds.includes(id),
          )
      : [];

  useEffect(() => {
    if (relatedPlacesState.status !== 'error') return;
    setShowRelatedPlacesErrorToast(true);
    const timer = setTimeout(() => setShowRelatedPlacesErrorToast(false), 3000);
    return () => clearTimeout(timer);
  }, [relatedPlacesState.status]);

  if (!detail) {
    return (
      <main className="min-h-dvh bg-gray-0" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <Header left={<BackButton />} />
        <p className="px-4 pt-20 text-center text-b2 font-medium text-gray-60">
          게시물을 찾을 수 없어요
        </p>
      </main>
    );
  }

  const { post, title, groupName, groupColor } = detail;
  const images = post.images ?? [];

  return (
    <main
      className="min-h-dvh bg-gray-0"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))',
      }}
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
          groupName={groupName}
          groupColor={groupColor}
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
        bookmarkedPlaceIds={bookmarkedPlaceIds}
        onBookmarkedChange={toggleBookmark}
        onDirectAddClick={() => setDirectInputOpen(true)}
      />

      <MemoSheet open={memoOpen} onOpenChange={setMemoOpen} memo={memo} onSave={setMemo} />

      {viewerOpen ? <PostImageViewer images={images} onClose={() => setViewerOpen(false)} /> : null}

      <PlaceDirectInputDrawer open={directInputOpen} onOpenChange={setDirectInputOpen} />

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
