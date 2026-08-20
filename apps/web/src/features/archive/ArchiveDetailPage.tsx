import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { useBottomMenuVisibility } from '@/app/bottom-menu-visibility';
import { PinnedHeaderLayout } from '@/app/layouts/PinnedHeaderLayout';
import { useIsAuthenticated } from '@/features/auth/session/AuthSessionProvider';
import { PlaceCard } from '@/features/place';
import { ShareSheet } from '@/features/share/components/ShareSheet';
import { buildShareUrl } from '@/features/share/lib/shareUrl';
import { Icon16ArrowUpTray } from '@/shared/icons/NookIcons';
import { useHistoryBackedFlag } from '@/shared/lib/useHistoryBackedFlag';
import { useInfiniteScrollSentinel } from '@/shared/lib/useInfiniteScrollSentinel';
import { cn } from '@/shared/lib/utils';
import { useToast } from '@/shared/toast';
import {
  BackButton,
  BOTTOM_BAR_INSET_VAR,
  BOTTOM_MENU_HEIGHT,
  Button,
  COLOR_BG_CLASS,
  Header,
  Popup,
} from '@/shared/ui';
import {
  useArchivePlaces,
  useArchivePosts,
  useArchives,
  useDeleteArchive,
  useDeleteArchivePosts,
  useIssueShareLink,
  useRemoveSharedArchive,
} from './api/queries';
import { ArchiveDetailMenu } from './components/ArchiveDetailMenu';
import { ArchiveEmpty } from './components/ArchiveEmpty';
import { CollectionCard } from './components/CollectionCard';
import { GUEST_ARCHIVE } from './guest';

type DetailTab = 'posts' | 'places';

/**
 * Figma `butto/40_save` Default·`button/40_share`(236:9689, 236:9689) — 40px 칩 버튼.
 * 공용 Button 은 전 variant 라벨이 흰색 고정이라(gray-10 바탕 + gray-100 라벨을 못
 * 만든다) 여기서 직접 그린다 — SharedArchivePage 의 같은 칩과 동일한 스타일.
 */
const ARCHIVE_ACTION_CHIP = cn(
  'inline-flex h-10 shrink-0 items-center justify-center gap-1 rounded-lg bg-gray-10 px-4',
  'text-b3 font-medium text-gray-100',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100',
);

/** 선택 모드 CTA 바 높이(p-4 16px + Button_52 + 16px) — 콘텐츠 하단 패딩이 비켜줄 몫. */
const SELECT_CTA_HEIGHT = '5.25rem';

/** Figma `아카이브 > 아카이브 상세` (게시물/장소 탭 · 더보기 메뉴 · 선택 삭제 · 빈 아카이브). */
export function ArchiveDetailPage() {
  const { archiveId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<DetailTab>('posts');
  const [deletePopupOpen, setDeletePopupOpen] = useState(false);

  // 선택 삭제(Figma `게시글 편집`) — 더보기 메뉴로 켜고, 뒤로가기/장소 탭 전환으로 끈다.
  // 뒤로가기 세 경로(좌상단 버튼·Android 하드웨어 백·iOS 엣지 스와이프)가 모두 "모드 종료"로
  // 수렴해야 해서 히스토리 엔트리로 승격한다 — 컴포넌트 state 로 두면 버튼만 모드를 끄고
  // 스와이프는 페이지를 떠나버린다.
  const [selecting, openSelecting, closeSelecting] = useHistoryBackedFlag('selectingPosts');
  const [selectedPostIds, setSelectedPostIds] = useState<ReadonlySet<number>>(new Set());
  const [deletePostsPopupOpen, setDeletePostsPopupOpen] = useState(false);

  const issueShare = useIssueShareLink();
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const isAuthenticated = useIsAuthenticated();

  // 상세 전용 API가 아직 없어 목록 캐시에서 고른다. 게스트는 그 쿼리가 막혀 있어
  // 목록 화면과 같은 기본 아카이브를 그대로 쓴다(빈 상세로 열린다).
  const { data: archives, isPending } = useArchives();
  const archive = isAuthenticated
    ? archives?.find((item) => String(item.id) === archiveId)
    : GUEST_ARCHIVE;

  const postsQuery = useArchivePosts(archive?.id);
  const posts = postsQuery.data?.posts;
  const placesQuery = useArchivePlaces(archive?.id);
  const places = placesQuery.data?.places;

  const deleteArchive = useDeleteArchive();
  const deleteArchivePosts = useDeleteArchivePosts();
  const removeShared = useRemoveSharedArchive();
  const [removePopupOpen, setRemovePopupOpen] = useState(false);

  // 게시물이 하나도 없으면 시안대로 탭 없이 빈 상태만 보여준다 — 장소는 게시물에서
  // 파생되므로 게시물이 없으면 장소도 없다. 로딩 중(undefined)에는 판단을 미룬다.
  // 게스트는 게시물 쿼리도 막혀 있어 영영 undefined 다 — 빈 아카이브로 확정한다.
  const isEmpty = !isAuthenticated || (posts !== undefined && posts.length === 0);

  // 선택 모드 동안은 하단 탭바 대신 삭제 CTA 바가 자리를 차지한다.
  const { setHidden: setBottomMenuHidden } = useBottomMenuVisibility();
  useEffect(() => {
    setBottomMenuHidden(selecting);
    return () => setBottomMenuHidden(false);
  }, [selecting, setBottomMenuHidden]);

  // 그 CTA 바 높이를 알려 토스트가 위로 비켜 앉게 한다(탭바 변수와 주인이 다르다).
  useEffect(() => {
    const root = document.documentElement;
    if (!selecting) {
      root.style.removeProperty(BOTTOM_BAR_INSET_VAR);
      return;
    }
    root.style.setProperty(
      BOTTOM_BAR_INSET_VAR,
      `calc(${SELECT_CTA_HEIGHT} + env(safe-area-inset-bottom))`,
    );
    return () => {
      root.style.removeProperty(BOTTOM_BAR_INSET_VAR);
    };
  }, [selecting]);

  // 스와이프·하드웨어 백으로 빠져나오면 exitSelecting 을 거치지 않는다 — 다시 들어왔을 때
  // 지난 선택이 남아 있지 않도록 모드가 꺼지는 것 자체를 보고 비운다.
  useEffect(() => {
    if (!selecting) setSelectedPostIds(new Set());
  }, [selecting]);

  const exitSelecting = () => {
    // 장소 탭 전환처럼 모드가 아닐 때도 불린다 — 그때 navigate(-1) 하면 페이지를 떠난다.
    if (selecting) closeSelecting();
  };

  const togglePostSelected = (postId: number) => {
    setSelectedPostIds((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  // 그리드/목록 끝(sentinel)이 화면에 들어오면 활성 탭의 다음 페이지를 당긴다.
  const sentinelRef = useInfiniteScrollSentinel(activeTab === 'posts' ? postsQuery : placesQuery);

  if (isAuthenticated && isPending) return null;

  if (!archive) {
    return (
      <main
        className="fixed inset-0 flex flex-col bg-gray-0"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <Header left={<BackButton />} />
        <ArchiveEmpty message="아카이브를 찾을 수 없어요" />
      </main>
    );
  }

  const isShared = archive.accessType === 'SHARED';

  const tabs: { key: DetailTab; label: string; count: number | undefined }[] = [
    { key: 'posts', label: '게시물', count: postsQuery.data?.totalElements },
    { key: 'places', label: '장소', count: placesQuery.data?.totalElements },
  ];

  // 헤더에 이어 아카이브 정보(이름·색·소유자)와 게시물/장소 탭까지 함께 고정한다 —
  // 아카이브 이름 줄수·작성자 표기·탭 유무에 따라 높이가 변하지만, 콘텐츠 시작 위치는
  // 레이아웃이 실측해 맞춰준다. 하단 탭바(ProtectedAppLayout)와 선택 모드 CTA 바는
  // fixed 라, 콘텐츠는 하단 패딩으로만 비켜준다.
  return (
    <PinnedHeaderLayout
      header={
        <>
          <Header
            // 선택 모드의 뒤로가기는 페이지 이탈이 아니라 모드 종료다.
            left={<BackButton onClick={selecting ? exitSelecting : undefined} />}
            right={
              // 게스트에게는 더보기 자체를 내린다 — 편집·삭제·선택 삭제가 전부 계정
              // 동작이라, 열어봐야 누르는 족족 월이 뜨는 메뉴가 된다.
              isAuthenticated ? (
                isShared ? (
                  <ArchiveDetailMenu kind="shared" onRemove={() => setRemovePopupOpen(true)} />
                ) : (
                  <ArchiveDetailMenu
                    kind="owned"
                    onEdit={() => navigate(`/archive/${archive.id}/edit`)}
                    onShare={() =>
                      issueShare.mutate(archive.id, {
                        onSuccess: (token) => setShareUrl(buildShareUrl(token)),
                        onError: () =>
                          showToast({ variant: 'simple', title: '공유 링크를 만들지 못했어요' }),
                      })
                    }
                    // 선택 삭제는 게시물 전용이다 — 장소 탭에서는 항목 자체를 내리고,
                    // 탭을 바꿔서 억지로 되돌리지도 않는다(아카이브에서 장소를 빼는 API 가 없다).
                    onSelectDelete={activeTab === 'posts' ? openSelecting : undefined}
                    onDelete={() => setDeletePopupOpen(true)}
                  />
                )
              ) : null
            }
          />

          <div
            className={cn(
              'flex flex-col gap-1 px-4 pt-2 pb-4',
              // 빈 아카이브는 탭이 없어 정보 영역이 직접 경계선을 긋는다.
              isEmpty && 'border-gray-20 border-b',
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={`size-3 shrink-0 ${COLOR_BG_CLASS[archive.color]}`}
                aria-hidden="true"
              />
              <h1 className="min-w-0 truncate text-h1 font-semibold text-gray-100">
                {archive.name}
              </h1>
            </div>
            {postsQuery.data?.ownerNickname ? (
              <p className="font-mono text-e2 text-gray-60">by {postsQuery.data.ownerNickname}</p>
            ) : null}
          </div>

          {/* 편집·공유 칩 — 더보기 메뉴 안에도 같은 액션이 있지만(삭제 등과 함께),
              자주 쓰는 두 액션은 시안대로 바로 누를 수 있게 앞으로 뺀다. 공유 아카이브는
              내 소유가 아니라(더보기 메뉴처럼) 노출하지 않는다. */}
          {isAuthenticated && !isShared ? (
            <div className="flex gap-2 px-4 pb-4">
              <button
                type="button"
                onClick={() => navigate(`/archive/${archive.id}/edit`)}
                className={ARCHIVE_ACTION_CHIP}
              >
                아카이브 편집
              </button>
              <button
                type="button"
                onClick={() =>
                  issueShare.mutate(archive.id, {
                    onSuccess: (token) => setShareUrl(buildShareUrl(token)),
                    onError: () =>
                      showToast({ variant: 'simple', title: '공유 링크를 만들지 못했어요' }),
                  })
                }
                className={ARCHIVE_ACTION_CHIP}
              >
                공유
                <Icon16ArrowUpTray />
              </button>
            </div>
          ) : null}

          {/* 게시물/장소 탭도 고정 — 카운트는 각 목록 응답의 totalElements 가 채운다. */}
          {isEmpty ? null : (
            <div role="tablist" className="flex px-4">
              {tabs.map((tab) => {
                const selected = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => {
                      // 장소 탭에는 선택 개념이 없다 — 전환하면 선택 모드를 접는다.
                      if (tab.key === 'places') exitSelecting();
                      setActiveTab(tab.key);
                    }}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-1.5 border-b px-2.5 py-3',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100 focus-visible:ring-inset',
                      selected ? 'border-gray-100 text-gray-100' : 'border-gray-20 text-gray-50',
                    )}
                  >
                    <span className={cn('text-b2', selected ? 'font-semibold' : 'font-medium')}>
                      {tab.label}
                    </span>
                    {tab.count !== undefined ? (
                      <span className="font-mono text-e2">{tab.count}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </>
      }
      contentStyle={{
        // 선택 모드에선 CTA 바가, 평소엔 하단 탭바가 fixed 로 떠 있어 그만큼 비켜준다.
        paddingBottom: selecting
          ? `calc(1.25rem + ${SELECT_CTA_HEIGHT} + env(safe-area-inset-bottom))`
          : `calc(1.25rem + ${BOTTOM_MENU_HEIGHT})`,
      }}
    >
      <main>
        {isEmpty ? (
          <ArchiveEmpty message="저장한 게시물이 없어요" />
        ) : activeTab === 'posts' ? (
          <div className="grid grid-cols-2 gap-x-2 gap-y-5 px-4 pt-4">
            {posts?.map((post) => (
              <CollectionCard
                key={post.id}
                archive={post}
                selected={selecting ? selectedPostIds.has(post.id) : undefined}
                onClick={
                  isShared
                    ? // `/post/{id}`는 소유 데이터 전용이라 공유 게시물에선 404 다 — 공유 상세로 보낸다.
                      // shareToken 이 없거나(비정상 데이터) 처리 중·실패 게시물(상세에 보여줄
                      // 데이터가 없다)이면 기존처럼 undefined 로 둔다.
                      archive.shareToken && !post.processingState
                      ? () => navigate(`/shared/${archive.shareToken}/post/${post.id}`)
                      : undefined
                    : selecting
                      ? () => togglePostSelected(post.id)
                      : () => navigate(`/post/${post.id}`)
                }
              />
            ))}
          </div>
        ) : places?.length === 0 ? (
          <ArchiveEmpty message="저장한 장소가 없어요" />
        ) : (
          // 게시물 탭과 같은 2열 그리드 — 카드도 최근 저장한 공간 바텀시트와 같은
          // 세로형 장소 카드(PlaceCard)를 쓴다.
          <div className="grid grid-cols-2 gap-x-2 gap-y-5 px-4 pt-4">
            {places?.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                // 장소 상세는 지도 화면이 소유한다 — 연관 장소 클릭과 같은 딥링크.
                // 공유(SHARED) 아카이브의 장소는 내 상세 API 로는 404 라(내 저장 장소
                // 기준), 공개 API 우회용 공유 토큰을 함께 실어 보낸다.
                onClick={() =>
                  navigate(
                    isShared && archive.shareToken
                      ? `/map?placeId=${place.id}&shareToken=${archive.shareToken}`
                      : `/map?placeId=${place.id}`,
                  )
                }
              />
            ))}
          </div>
        )}
        {/* 다음 페이지 트리거. 마지막 페이지면 관찰 대상이 없어 아무 일도 하지 않는다. */}
        <div ref={sentinelRef} aria-hidden="true" className="h-1" />
      </main>

      {/* 선택 모드 CTA — 숨긴 하단 탭바처럼 body 포탈 + fixed 로 화면에 붙인다
          (Figma `Button_Primary_52`). */}
      {selecting
        ? createPortal(
            <div className="fixed inset-x-0 bottom-0 z-50">
              <div
                className="mx-auto w-full max-w-[450px] bg-gray-0 p-4"
                style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
              >
                <Button
                  size="lg"
                  fullWidth
                  disabled={selectedPostIds.size === 0 || deleteArchivePosts.isPending}
                  onClick={() => setDeletePostsPopupOpen(true)}
                >
                  {selectedPostIds.size > 0 ? `${selectedPostIds.size}개 삭제하기` : '삭제하기'}
                </Button>
              </div>
            </div>,
            document.body,
          )
        : null}

      <Popup
        open={deletePostsPopupOpen}
        onClose={() => setDeletePostsPopupOpen(false)}
        title={`${selectedPostIds.size}개 게시물을 삭제하시겠어요?`}
        description={
          <>
            게시물을 삭제하면 게시물에 포함된
            <br />
            장소도 모두 삭제돼요.
          </>
        }
        confirmLabel="삭제하기"
        variant="warning"
        onConfirm={() =>
          deleteArchivePosts.mutate([...selectedPostIds], {
            // 일부 실패 시에도 성공분은 지워졌고 onSettled 무효화로 목록이 갱신되므로,
            // 성공/실패 모두 선택 모드는 접고 실패만 토스트로 알린다.
            onSuccess: () => exitSelecting(),
            onError: () => {
              exitSelecting();
              showToast({ variant: 'simple', title: '게시물을 삭제하지 못했어요' });
            },
          })
        }
      />

      <Popup
        open={deletePopupOpen}
        onClose={() => setDeletePopupOpen(false)}
        title="아카이브를 삭제하시겠어요?"
        description={
          <>
            아카이브를 삭제하면 아카이브에 포함된
            <br />
            게시물도 모두 삭제돼요.
          </>
        }
        confirmLabel="삭제하기"
        variant="warning"
        onConfirm={() =>
          deleteArchive.mutate(archive.id, {
            onSuccess: () => {
              navigate('/archive', { replace: true });
              showToast({ variant: 'simple', title: `"${archive.name}" 아카이브가 삭제 됐어요.` });
            },
          })
        }
      />

      <Popup
        open={removePopupOpen}
        onClose={() => setRemovePopupOpen(false)}
        title="내 목록에서 제거하시겠어요?"
        description={
          <>
            공유받은 아카이브가 내 목록에서 사라져요.
            <br />
            원본에는 영향이 없어요.
          </>
        }
        confirmLabel="제거하기"
        variant="warning"
        onConfirm={() =>
          removeShared.mutate(archive.id, {
            onSuccess: () => {
              navigate('/archive', { replace: true });
              showToast({ variant: 'simple', title: `"${archive.name}" 아카이브를 제거했어요.` });
            },
            onError: () => showToast({ variant: 'simple', title: '아카이브를 제거하지 못했어요' }),
          })
        }
      />

      {shareUrl ? (
        <ShareSheet
          open
          onOpenChange={(open) => !open && setShareUrl(null)}
          url={shareUrl}
          archive={archive}
        />
      ) : null}
    </PinnedHeaderLayout>
  );
}
