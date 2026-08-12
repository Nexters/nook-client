import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useHideBottomMenu } from '@/app/bottom-menu-visibility';
import type { Place } from '@/features/place';
import { capturePostHogEvent } from '@/lib/posthog';
import { useBackInterceptor } from '@/shared/lib/backInterceptors';
import { useHistoryBackedFlag } from '@/shared/lib/useHistoryBackedFlag';
import { cn } from '@/shared/lib/utils';
import { useToast } from '@/shared/toast';
import { BackButton, Header } from '@/shared/ui';
import {
  usePostDetail,
  useRelatedPlaces,
  useUpdatePlaceBookmark,
  useUpdatePostMemo,
} from './api/queries';
import { MemoSheet } from './components/MemoSheet';
import { OriginalPostLink } from './components/OriginalPostLink';
import { PlaceDirectInputDrawer } from './components/PlaceDirectInputDrawer';
import { PostDetailLoadingView } from './components/PostDetailLoadingView';
import { PostImages } from './components/PostImages';
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
  const [searchParams] = useSearchParams();
  const enteredFromShare = searchParams.get('entry') === 'share';
  useHideBottomMenu();

  const postDetailState = usePostDetail(postId);
  const updateMemoMutation = useUpdatePostMemo(postId);
  const [memoOpen, setMemoOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  // 뒤로가기(버튼·하드웨어 백·스와이프)로 닫혀야 해서 히스토리 엔트리로 승격한다.
  const [viewerOpen, openViewer, closeViewer] = useHistoryBackedFlag('imageViewer');
  const relatedPlacesState = useRelatedPlaces(postId);
  const [directInputOpen, setDirectInputOpen] = useState(false);
  const { showToast } = useToast();
  const firstRelatedPlaceId =
    relatedPlacesState.status === 'success' ? relatedPlacesState.places[0]?.id : undefined;
  const shareEntryBackTarget = firstRelatedPlaceId
    ? `/map?placeId=${encodeURIComponent(firstRelatedPlaceId)}`
    : '/map';

  function handleBack() {
    if (enteredFromShare) {
      navigate(shareEntryBackTarget, { replace: true });
      return;
    }
    navigate(-1);
  }

  // 공유 진입은 히스토리가 없어 navigate(-1) 로는 못 돌아간다 — 하드웨어 백도 버튼과
  // 같은 목적지(지도)로 보낸다. 뷰어가 떠 있으면 히스토리 뒤로(뷰어 닫기)에 양보한다.
  useBackInterceptor(
    useCallback(() => {
      if (!enteredFromShare || viewerOpen) return false;
      navigate(shareEntryBackTarget, { replace: true });
      return true;
    }, [enteredFromShare, viewerOpen, navigate, shareEntryBackTarget]),
  );

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
    updateBookmarkMutation.mutate(
      { placeId: Number(placeId), bookmarked: next },
      {
        onSuccess: () => {
          capturePostHogEvent('place_bookmark_updated', {
            post_id: postId,
            place_id: Number(placeId),
            bookmarked: next,
          });
        },
      },
    );
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
    capturePostHogEvent('place_directly_added', { post_id: postId, place_id: place.id });
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
    showToast({
      variant: 'description',
      title: '위치를 찾지 못 했어요',
      description: '게시물은 저장됐지만 지도에는 표시되지 않아요',
    });
  }, [relatedPlacesState.status, showToast]);

  if (postDetailState.status !== 'success') {
    return (
      <main className="min-h-dvh bg-gray-0" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <Header left={<BackButton onClick={handleBack} />} />
        {postDetailState.status === 'loading' ? (
          <PostDetailLoadingView />
        ) : (
          <p className="px-4 pt-20 text-center text-b2 font-medium text-gray-60">
            게시물을 찾을 수 없어요
          </p>
        )}
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
        <Header left={<BackButton onClick={handleBack} />} />

        <PostImages images={images} onImageClick={openViewer} />

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
            onGroupClick={(groupId) => navigate(`/group/${groupId}`)}
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
        onSave={(next) =>
          updateMemoMutation.mutate(next, {
            onSuccess: () => capturePostHogEvent('post_memo_saved', { post_id: postId }),
          })
        }
      />

      {viewerOpen ? <PostImageViewer images={images} onClose={closeViewer} /> : null}

      <PlaceDirectInputDrawer
        open={directInputOpen}
        onOpenChange={setDirectInputOpen}
        onPlaceConfirmed={handlePlaceConfirmed}
      />
    </main>
  );
}
