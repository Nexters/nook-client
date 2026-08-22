import { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useHideBottomMenu } from '@/app/bottom-menu-visibility';
import { PinnedHeaderLayout } from '@/app/layouts/PinnedHeaderLayout';
import { EntryLoginWall } from '@/features/auth/components/LoginWall';
import { useIsAuthenticated } from '@/features/auth/session/AuthSessionProvider';
import { PushPrimingSheet } from '@/features/notifications/components/PushPrimingSheet';
import { capturePostHogEvent } from '@/lib/posthog';
import { useBackInterceptor } from '@/shared/lib/backInterceptors';
import { useHistoryBackedFlag } from '@/shared/lib/useHistoryBackedFlag';
import { useToast } from '@/shared/toast';
import { BackButton, Header } from '@/shared/ui';
import {
  toPlace,
  useConnectPlace,
  usePostDetail,
  useRelatedPlaces,
  useUpdatePlaceBookmark,
  useUpdatePostMemo,
} from './api/queries';
import { ExpandableCaption } from './components/ExpandableCaption';
import { MemoSheet } from './components/MemoSheet';
import { OriginalPostLink } from './components/OriginalPostLink';
import { PlaceDirectInputDrawer } from './components/PlaceDirectInputDrawer';
import { PostDetailErrorView } from './components/PostDetailErrorView';
import { PostDetailLoadingView } from './components/PostDetailLoadingView';
import { PostImages } from './components/PostImages';
import { PostImageViewer } from './components/PostImageViewer';
import { PostInfo } from './components/PostInfo';
import { GoHomeTooltip, PostParsingView } from './components/PostParsingView';
import { PostVideoViewer } from './components/PostVideoViewer';
import { RelatedPlacesSection } from './components/RelatedPlacesSection';
import type { SearchedPlace } from './types';

/**
 * Figma `아카이브 > 게시물 상세` (연관 장소 O / X, 메모 최대글자수, 이미지 확대 뷰)
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
  const isAuthenticated = useIsAuthenticated();
  const [searchParams] = useSearchParams();
  const enteredFromShare = searchParams.get('entry') === 'share';
  useHideBottomMenu();

  const postDetailState = usePostDetail(postId);
  const updateMemoMutation = useUpdatePostMemo(postId);
  const [memoOpen, setMemoOpen] = useState(false);
  // 뒤로가기(버튼·하드웨어 백·스와이프)로 닫혀야 해서 히스토리 엔트리로 승격한다.
  const [viewerOpen, openViewer, closeViewer] = useHistoryBackedFlag('imageViewer');
  // 확대뷰가 시작할 이미지 — 누른 그 이미지다. 열림 여부는 위 히스토리 플래그가 소유하고,
  // 인덱스는 거기 딸린 부가 정보라 컴포넌트 state 로 든다(뒤로가기 계약은 그대로).
  const [viewerIndex, setViewerIndex] = useState(0);
  const openViewerAt = (index: number) => {
    setViewerIndex(index);
    openViewer();
  };
  // 영상 확대뷰는 이미지 뷰어와 레이아웃이 달라 별도 레이어다. 닫는 방식은 같다.
  const [videoViewerOpen, openVideoViewer, closeVideoViewer] = useHistoryBackedFlag('videoViewer');
  const relatedPlacesState = useRelatedPlaces(postId);
  const [directInputOpen, setDirectInputOpen] = useState(false);
  const { showToast } = useToast();
  const firstRelatedPlaceId =
    relatedPlacesState.status === 'success' ? relatedPlacesState.places[0]?.id : undefined;
  const shareEntryBackTarget = firstRelatedPlaceId
    ? `/map?placeId=${encodeURIComponent(firstRelatedPlaceId)}`
    : '/map';

  const isProcessing = postDetailState.status === 'processing';

  function handleBack() {
    // 파싱 중엔 돌아갈 완성 화면이 없다 — 툴팁 문구대로 홈(지도)으로 보낸다.
    if (isProcessing) {
      navigate('/map', { replace: true });
      return;
    }
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
      if (viewerOpen || videoViewerOpen) return false;
      if (isProcessing) {
        navigate('/map', { replace: true });
        return true;
      }
      if (!enteredFromShare) return false;
      navigate(shareEntryBackTarget, { replace: true });
      return true;
    }, [
      isProcessing,
      enteredFromShare,
      viewerOpen,
      videoViewerOpen,
      navigate,
      shareEntryBackTarget,
    ]),
  );

  const updateBookmarkMutation = useUpdatePlaceBookmark(postId);
  const connectPlaceMutation = useConnectPlace(postId);

  const toggleBookmark = (placeId: string, next: boolean) => {
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

  function handleRelatedPlaceClick(placeId: string) {
    navigate(`/map?placeId=${Number(placeId)}`);
  }

  function handlePlaceConfirmed(place: SearchedPlace) {
    connectPlaceMutation.mutate(place.selectionToken, {
      onSuccess: (placeId) => {
        capturePostHogEvent('place_directly_added', { post_id: postId, place_id: placeId });
        showToast({ variant: 'simple', title: '아카이브에 저장됐어요' });
        setDirectInputOpen(false);
      },
      onError: () => {
        // 드로어를 유지해 그대로 다시 시도할 수 있게 한다(selectionToken 은 만료형이라
        // 시간이 지났으면 재검색이 필요할 수 있다).
        showToast({
          variant: 'description',
          title: '장소를 추가하지 못했어요',
          description: '잠시 후 다시 시도해주세요',
        });
      },
    });
  }

  // 직접 연결한 장소는 파싱 응답(place-parsing)에 없을 수 있다(파싱 FAILED 게시물 등) —
  // 게시물 상세 응답의 장소를 함께 넘겨 어느 쪽에 실려와도 목록에 보이게 한다.
  const detailPlaces = postDetailState.status === 'success' ? postDetailState.detail.places : [];

  const bookmarkedPlaceIds = [
    ...(relatedPlacesState.status === 'success' ? relatedPlacesState.bookmarkedPlaceIds : []),
    ...detailPlaces.filter((place) => place.bookmarked).map((place) => String(place.id)),
  ];

  // 게스트가 닿는 경로는 공유 확장의 "앱에서 보기" 딥링크뿐이다. 게시물은 저장한
  // 사람만 볼 수 있어 그릴 내용이 없으니 진입을 월로 막는다.
  if (!isAuthenticated) {
    return <EntryLoginWall description="게시물을 보려면 로그인이 필요해요" />;
  }

  // 로딩·파싱·에러는 스켈레톤과 안내 문구뿐이라 문서를 늘리지 않고 뷰포트에 가둔다 —
  // 헤더는 흐름 그대로 위에 남고, 넘치는 만큼만 아래 영역이 스크롤된다.
  if (postDetailState.status !== 'success') {
    return (
      <main
        className="fixed inset-0 flex flex-col bg-gray-0"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="relative shrink-0">
          <Header left={<BackButton onClick={handleBack} />} />
          {isProcessing ? <GoHomeTooltip /> : null}
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
          {isProcessing ? (
            <PostParsingView percent={postDetailState.percent} />
          ) : postDetailState.status === 'loading' ? (
            <PostDetailLoadingView />
          ) : (
            <PostDetailErrorView />
          )}
        </div>
        {/* 파싱 화면은 "완료되면 알림을 보내드릴게요"라고 약속한다 — 권한이 미결정인
            사용자에게 여기서만 알림 허용을 권한다. 즉시 완료 저장은 이 분기를 안 탄다. */}
        <PushPrimingSheet active={isProcessing} />
      </main>
    );
  }

  const { post, title, archives, memo } = postDetailState.detail;
  const images = post.images ?? [];

  // 콘텐츠는 문서 흐름 그대로 #root 스크롤에 맡기고(러버밴드), 헤더만 화면에 고정한다.
  return (
    <PinnedHeaderLayout
      header={<Header left={<BackButton onClick={handleBack} />} />}
      contentStyle={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
    >
      <main>
        <PostImages images={images} onImageClick={openViewerAt} onVideoExpand={openVideoViewer} />

        <div className="flex flex-col gap-2 px-4 pt-1">
          <h1 className="text-h2 font-semibold text-gray-100">{title}</h1>

          {post.caption ? <ExpandableCaption caption={post.caption} /> : null}

          <PostInfo
            archives={archives}
            memo={memo}
            onMemoEdit={() => setMemoOpen(true)}
            onArchiveClick={(archiveId) => navigate(`/archive/${archiveId}`)}
            className="pt-2"
          />

          {post.originalUrl ? (
            <OriginalPostLink label={post.authorHandle} href={post.originalUrl} className="mt-2" />
          ) : null}
        </div>

        <RelatedPlacesSection
          postId={postId}
          state={relatedPlacesState}
          postPlaces={detailPlaces.map(toPlace)}
          bookmarkedPlaceIds={bookmarkedPlaceIds}
          onBookmarkedChange={toggleBookmark}
          onDirectAddClick={() => setDirectInputOpen(true)}
          onPlaceClick={handleRelatedPlaceClick}
        />
      </main>

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

      {/* fixed 오버레이 — 페이지가 뷰포트보다 길면 셸(will-change-transform)에 붙어
          화면 밖으로 밀려나니 body 로 포탈해 뷰포트 기준으로 띄운다. */}
      {viewerOpen
        ? createPortal(
            <PostImageViewer images={images} initialIndex={viewerIndex} onClose={closeViewer} />,
            document.body,
          )
        : null}

      {/* 확대 버튼은 단일 영상일 때만 뜨므로 여는 쪽이 곧 images[0] 이다. */}
      {videoViewerOpen && images[0]
        ? createPortal(
            <PostVideoViewer src={images[0]} onClose={closeVideoViewer} />,
            document.body,
          )
        : null}

      <PlaceDirectInputDrawer
        open={directInputOpen}
        onOpenChange={setDirectInputOpen}
        onPlaceConfirmed={handlePlaceConfirmed}
        confirmPending={connectPlaceMutation.isPending}
      />
    </PinnedHeaderLayout>
  );
}
