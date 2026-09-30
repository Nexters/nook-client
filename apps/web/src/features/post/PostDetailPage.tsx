import { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useHideBottomMenu } from '@/app/bottom-menu-visibility';
import { PinnedHeaderLayout, PinnedHeaderTitle } from '@/app/layouts/PinnedHeaderLayout';
import { useArchives } from '@/features/archive/api/queries';
import { EntryLoginWall } from '@/features/auth/components/LoginWall';
import { useIsAuthenticated } from '@/features/auth/session/AuthSessionProvider';
import { PushPrimingSheet } from '@/features/notifications/components/PushPrimingSheet';
import { SavePostSheet } from '@/features/share/components/SavePostSheet';
import { capturePostHogEvent } from '@/lib/posthog';
import { useBackInterceptor } from '@/shared/lib/backInterceptors';
import { useHistoryBackedFlag } from '@/shared/lib/useHistoryBackedFlag';
import { useToast } from '@/shared/toast';
import { BackButton, Header, Popup } from '@/shared/ui';
import {
  toPlace,
  useConnectPlace,
  useDeletePost,
  usePostDetail,
  useRelatedPlaces,
  useUpdatePlaceBookmark,
  useUpdatePostArchives,
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
import { isPostFromList } from './postEntry';
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
  // 게시물 여러 개를 보여주던 화면에서 들어왔는가 — 삭제 뒤 그 화면으로 돌아갈지 홈 지도로 갈지.
  const enteredFromList = isPostFromList(useLocation().state);
  useHideBottomMenu();

  // 게시물 제목. 스크롤에 실려 헤더 뒤로 숨으면 헤더가 같은 제목을 이어받는다 —
  // 아카이브 상세의 아카이브명과 같은 계약이다.
  const titleRef = useRef<HTMLHeadingElement>(null);

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

  // 아카이브 칩(⌄)이 여는 시트 — 체크를 바꿔 저장하면 이동, 전부 해제하면 삭제(Figma `게시물 이동`·
  // `게시물 삭제`). 이동은 이 화면에 머무르고, 삭제는 떠난다(QA).
  const [archivesSheetOpen, setArchivesSheetOpen] = useState(false);
  const [deletePopupOpen, setDeletePopupOpen] = useState(false);
  const updateArchivesMutation = useUpdatePostArchives(postId);
  const deletePostMutation = useDeletePost(postId);
  const { data: myArchives } = useArchives();

  function handleArchivesSave(
    currentMemo: string | undefined,
    { groupIds, memo: nextMemo }: { groupIds: number[]; memo?: string },
  ) {
    updateArchivesMutation.mutate(
      {
        archiveIds: groupIds,
        // 메모는 바뀌었을 때만 보낸다 — 비우면 빈 문자열로 보내 지운다(updatePostMemo 가 null 로).
        memo: (nextMemo ?? '') !== (currentMemo ?? '') ? (nextMemo ?? '') : undefined,
      },
      {
        onSuccess: () => {
          setArchivesSheetOpen(false);
          const name =
            groupIds.length === 1
              ? myArchives?.find((archive) => archive.id === groupIds[0])?.name
              : undefined;
          // 보러가기는 붙이지 않는다 — 지금 보고 있는 이 게시물 상세로 가는 버튼이라 눌러도 제자리다(QA).
          showToast({
            variant: 'simple',
            title: name
              ? `"${name}"에 저장됐어요`
              : `"${groupIds.length}개의 아카이브"에 저장됐어요`,
          });
        },
        onError: () => showToast({ variant: 'simple', title: '아카이브를 바꾸지 못했어요' }),
      },
    );
  }

  function handleDeleteConfirm() {
    deletePostMutation.mutate(undefined, {
      onSuccess: () => {
        // 여러 게시물을 보던 화면에서 왔으면 그 화면으로 돌아가 머무르고(지운 카드만 빠진다),
        // 단일 게시물로 곧장 들어왔으면 돌아갈 목록이 없어 홈 지도로 보낸다(QA).
        if (enteredFromList) navigate(-1);
        else navigate('/map', { replace: true });
        showToast({ variant: 'simple', title: '게시물이 삭제됐어요' });
      },
      onError: () => showToast({ variant: 'simple', title: '게시물을 삭제하지 못했어요' }),
    });
  }

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
        showToast({ variant: 'simple', title: '아카이브에 추가됐어요' });
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
        {/* 오래 걸리는 저장(파싱 화면)에서만 — 권한이 미결정인 사용자에게 완료 알림을
            받을지 여기서 묻는다. 즉시 완료 저장은 이 분기를 안 탄다. */}
        <PushPrimingSheet active={isProcessing} />
      </main>
    );
  }

  const { post, title, archives, memo } = postDetailState.detail;
  const media = post.media ?? [];

  // 콘텐츠는 문서 흐름 그대로 #root 스크롤에 맡기고(러버밴드), 헤더만 화면에 고정한다.
  return (
    <PinnedHeaderLayout
      header={
        <Header
          left={<BackButton onClick={handleBack} />}
          title={<PinnedHeaderTitle target={titleRef}>{title}</PinnedHeaderTitle>}
        />
      }
      contentStyle={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
    >
      <main>
        <PostImages media={media} onImageClick={openViewerAt} onVideoExpand={openVideoViewer} />

        <div className="flex flex-col gap-2 px-4 pt-1">
          <h1 ref={titleRef} className="text-h2 font-semibold text-gray-100">
            {title}
          </h1>

          {post.caption ? <ExpandableCaption caption={post.caption} /> : null}

          <PostInfo
            archives={archives}
            memo={memo}
            onMemoEdit={() => setMemoOpen(true)}
            onArchivesClick={() => setArchivesSheetOpen(true)}
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

      <SavePostSheet
        open={archivesSheetOpen}
        onOpenChange={setArchivesSheetOpen}
        title="아카이브 수정"
        initialGroupIds={archives.map((archive) => archive.id)}
        initialMemo={memo}
        pending={updateArchivesMutation.isPending || deletePostMutation.isPending}
        onSave={(input) => handleArchivesSave(memo, input)}
        onDelete={() => {
          // 시안대로 시트를 걷고 게시물 위에 확인 팝업만 띄운다. 취소하면 게시물에 그대로 남는다.
          setArchivesSheetOpen(false);
          setDeletePopupOpen(true);
        }}
      />

      <Popup
        open={deletePopupOpen}
        onClose={() => setDeletePopupOpen(false)}
        title="게시물을 삭제하시겠어요?"
        description={
          <>
            게시물을 삭제하면 게시물에 포함된
            <br />
            장소도 모두 삭제돼요.
          </>
        }
        confirmLabel="삭제하기"
        variant="warning"
        onConfirm={handleDeleteConfirm}
      />

      {/* fixed 오버레이 — 페이지가 뷰포트보다 길면 셸(will-change-transform)에 붙어
          화면 밖으로 밀려나니 body 로 포탈해 뷰포트 기준으로 띄운다. */}
      {viewerOpen
        ? createPortal(
            <PostImageViewer media={media} initialIndex={viewerIndex} onClose={closeViewer} />,
            document.body,
          )
        : null}

      {/* 확대 버튼은 단일 영상일 때만 뜨므로 여는 쪽이 곧 media[0] 이다. */}
      {videoViewerOpen && media[0]
        ? createPortal(
            <PostVideoViewer src={media[0].url} onClose={closeVideoViewer} />,
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
