import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { useBottomMenuVisibility } from '@/app/bottom-menu-visibility';
import { PinnedHeaderLayout } from '@/app/layouts/PinnedHeaderLayout';
import { PlaceCard } from '@/features/place';
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
} from './api/queries';
import { ArchiveDetailMenu } from './components/ArchiveDetailMenu';
import { ArchiveEmpty } from './components/ArchiveEmpty';
import { CollectionCard } from './components/CollectionCard';

type DetailTab = 'posts' | 'places';

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
  const [selecting, setSelecting] = useState(false);
  const [selectedPostIds, setSelectedPostIds] = useState<ReadonlySet<number>>(new Set());
  const [selectedPlaceIds, setSelectedPlaceIds] = useState<ReadonlySet<number>>(new Set());
  // 확인 모달은 게시물·장소가 문구와 동작이 달라 어느 탭에서 열렸는지를 들고 있는다.
  const [deletePopupOpenFor, setDeletePopupOpenFor] = useState<DetailTab | null>(null);

  // 상세 전용 API가 아직 없어 목록 캐시에서 고른다.
  const { data: archives, isPending } = useArchives();
  const archive = archives?.find((item) => String(item.id) === archiveId);

  const postsQuery = useArchivePosts(archive?.id);
  const posts = postsQuery.data?.posts;
  const placesQuery = useArchivePlaces(archive?.id);
  // TODO(api): 아카이브에서 장소를 빼는 엔드포인트가 아직 없다(`/archives/{archiveId}/places` 는
  // GET 뿐). 그래서 삭제 결과를 이 화면 상태로만 들고 있어 새로고침·재진입하면 되살아난다.
  // 엔드포인트가 생기면 게시물 선택 삭제(`useDeleteArchivePosts`)와 같은 흐름으로 바꾸고
  // 이 목록은 걷어낸다.
  const [deletedPlaceIds, setDeletedPlaceIds] = useState<ReadonlySet<number>>(new Set());
  const places = placesQuery.data?.places.filter((place) => !deletedPlaceIds.has(Number(place.id)));

  const deleteArchive = useDeleteArchive();
  const deleteArchivePosts = useDeleteArchivePosts();

  // 게시물이 하나도 없으면 시안대로 탭 없이 빈 상태만 보여준다 — 장소는 게시물에서
  // 파생되므로 게시물이 없으면 장소도 없다. 로딩 중(undefined)에는 판단을 미룬다.
  const isEmpty = posts !== undefined && posts.length === 0;

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

  const exitSelecting = () => {
    setSelecting(false);
    setSelectedPostIds(new Set());
    setSelectedPlaceIds(new Set());
  };

  function toggle(ids: ReadonlySet<number>, id: number): ReadonlySet<number> {
    const next = new Set(ids);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  }

  // 선택 개수는 열려 있는 탭 기준이다 — CTA 라벨·활성화·확인 모달이 모두 이 값을 쓴다.
  const selectedCount = activeTab === 'posts' ? selectedPostIds.size : selectedPlaceIds.size;

  // 그리드/목록 끝(sentinel)이 화면에 들어오면 활성 탭의 다음 페이지를 당긴다.
  const activeQuery = activeTab === 'posts' ? postsQuery : placesQuery;
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = activeQuery;
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) fetchNextPage();
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isPending) return null;

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
              <ArchiveDetailMenu
                onEdit={() => navigate(`/archive/${archive.id}/edit`)}
                // 보고 있던 탭 그대로 선택 모드로 들어간다 — 장소를 고르려고 장소 탭에서
                // 연 사용자를 게시물 탭으로 되돌리지 않는다.
                onSelectDelete={() => setSelecting(true)}
                onDelete={() => setDeletePopupOpen(true)}
              />
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
                      // 선택 모드는 유지하되 고른 것은 비운다 — 탭마다 대상이 다르다.
                      setSelectedPostIds(new Set());
                      setSelectedPlaceIds(new Set());
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
                  selecting
                    ? () => setSelectedPostIds((prev) => toggle(prev, post.id))
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
                selected={selecting ? selectedPlaceIds.has(Number(place.id)) : undefined}
                onClick={
                  selecting
                    ? () => setSelectedPlaceIds((prev) => toggle(prev, Number(place.id)))
                    : // 장소 상세는 지도 화면이 소유한다 — 연관 장소 클릭과 같은 딥링크.
                      () => navigate(`/map?placeId=${place.id}`)
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
                  disabled={selectedCount === 0 || deleteArchivePosts.isPending}
                  onClick={() => setDeletePopupOpenFor(activeTab)}
                >
                  {selectedCount > 0 ? `${selectedCount}개 삭제하기` : '삭제하기'}
                </Button>
              </div>
            </div>,
            document.body,
          )
        : null}

      <Popup
        open={deletePopupOpenFor === 'places'}
        onClose={() => setDeletePopupOpenFor(null)}
        title={`${selectedPlaceIds.size}개 장소를 삭제하시겠어요?`}
        description={
          <>
            삭제한 장소는 이 아카이브에서
            <br />
            사라져요.
          </>
        }
        confirmLabel="삭제하기"
        variant="warning"
        onConfirm={() => {
          const removed = [...selectedPlaceIds];
          setDeletedPlaceIds((prev) => new Set([...prev, ...removed]));
          exitSelecting();
          showToast({
            variant: 'undo',
            title: `${removed.length}개 장소가 삭제 됐어요.`,
            onUndo: () =>
              setDeletedPlaceIds((prev) => {
                const next = new Set(prev);
                for (const id of removed) next.delete(id);
                return next;
              }),
          });
        }}
      />

      <Popup
        open={deletePopupOpenFor === 'posts'}
        onClose={() => setDeletePopupOpenFor(null)}
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
            onSuccess: () => navigate('/archive', { replace: true }),
          })
        }
      />
    </PinnedHeaderLayout>
  );
}
