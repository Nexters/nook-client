import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useBottomMenuVisibility } from '@/app/bottom-menu-visibility';
import { PlaceCard } from '@/features/place';
import { cn } from '@/shared/lib/utils';
import { useToast } from '@/shared/toast';
import { BackButton, BOTTOM_MENU_HEIGHT, Button, COLOR_BG_CLASS, Header, Popup } from '@/shared/ui';
import {
  useDeleteGroup,
  useDeleteGroupPosts,
  useGroupPlaces,
  useGroupPosts,
  useGroups,
} from './api/queries';
import { CollectionCard } from './components/CollectionCard';
import { GroupDetailMenu } from './components/GroupDetailMenu';
import { GroupEmpty } from './components/GroupEmpty';

type DetailTab = 'posts' | 'places';

/** Figma `그룹 > 그룹 상세` (게시물/장소 탭 · 더보기 메뉴 · 선택 삭제 · 빈 그룹). */
export function GroupDetailPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<DetailTab>('posts');
  const [deletePopupOpen, setDeletePopupOpen] = useState(false);

  // 선택 삭제(Figma `게시글 편집`) — 더보기 메뉴로 켜고, 뒤로가기/장소 탭 전환으로 끈다.
  const [selecting, setSelecting] = useState(false);
  const [selectedPostIds, setSelectedPostIds] = useState<ReadonlySet<number>>(new Set());
  const [deletePostsPopupOpen, setDeletePostsPopupOpen] = useState(false);

  // 상세 전용 API가 아직 없어 목록 캐시에서 고른다.
  const { data: groups, isPending } = useGroups();
  const group = groups?.find((item) => String(item.id) === groupId);

  const postsQuery = useGroupPosts(group?.id);
  const posts = postsQuery.data?.posts;
  const placesQuery = useGroupPlaces(group?.id);
  const places = placesQuery.data?.places;

  const deleteGroup = useDeleteGroup();
  const deleteGroupPosts = useDeleteGroupPosts();

  // 선택 모드 동안은 하단 탭바 대신 삭제 CTA 바가 자리를 차지한다.
  const { setHidden: setBottomMenuHidden } = useBottomMenuVisibility();
  useEffect(() => {
    setBottomMenuHidden(selecting);
    return () => setBottomMenuHidden(false);
  }, [selecting, setBottomMenuHidden]);

  const exitSelecting = () => {
    setSelecting(false);
    setSelectedPostIds(new Set());
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

  if (!group) {
    return (
      <main
        className="fixed inset-0 flex flex-col bg-gray-0"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <Header left={<BackButton />} />
        <GroupEmpty message="그룹을 찾을 수 없어요" />
      </main>
    );
  }

  // 게시물이 하나도 없으면 시안대로 탭 없이 빈 상태만 보여준다 — 장소는 게시물에서
  // 파생되므로 게시물이 없으면 장소도 없다. 로딩 중(undefined)에는 판단을 미룬다.
  const isEmpty = posts !== undefined && posts.length === 0;

  const tabs: { key: DetailTab; label: string; count: number | undefined }[] = [
    { key: 'posts', label: '게시물', count: postsQuery.data?.totalElements },
    { key: 'places', label: '장소', count: placesQuery.data?.totalElements },
  ];

  // 헤더를 고정하기 위해 페이지를 앱 셸에 붙이고(fixed inset-0 — 셸의
  // will-change-transform 이 fixed 의 기준을 셸로 잡아준다, GroupFormPage 와 같은
  // 패턴) 콘텐츠만 내부에서 스크롤한다. sticky 는 셸의 overflow-hidden 때문에
  // 기준 스크롤포트가 문서가 아닌 셸로 잡혀 동작하지 않는다.
  // 하단 탭바(BottomMenu, fixed z-60)는 이 페이지 위에 뜨므로 스크롤 영역
  // 패딩으로만 비켜준다.
  return (
    <main
      className="fixed inset-0 flex flex-col bg-gray-0"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <Header
        // 선택 모드의 뒤로가기는 페이지 이탈이 아니라 모드 종료다.
        left={<BackButton onClick={selecting ? exitSelecting : undefined} />}
        right={
          <GroupDetailMenu
            onEdit={() => navigate(`/group/${group.id}/edit`)}
            onSelectDelete={() => {
              // 선택 삭제는 게시물 대상 — 장소 탭에서 열었으면 게시물 탭으로 돌린다.
              setActiveTab('posts');
              setSelecting(true);
            }}
            onDelete={() => setDeletePopupOpen(true)}
          />
        }
      />

      {/* 그룹 정보(이름·색·소유자)는 헤더와 함께 고정 — 스크롤 영역 밖에 둔다. */}
      <div
        className={cn(
          'flex flex-col gap-1 px-4 pt-2 pb-4',
          // 빈 그룹은 탭이 없어 정보 영역이 직접 경계선을 긋는다.
          isEmpty && 'border-gray-20 border-b',
        )}
      >
        <div className="flex items-center gap-2">
          <span className={`size-3 shrink-0 ${COLOR_BG_CLASS[group.color]}`} aria-hidden="true" />
          <h1 className="min-w-0 truncate text-h1 font-semibold text-gray-100">{group.name}</h1>
        </div>
        {postsQuery.data?.ownerNickname ? (
          <p className="font-mono text-e2 text-gray-60">by {postsQuery.data.ownerNickname}</p>
        ) : null}
      </div>

      {isEmpty ? (
        <GroupEmpty message="저장한 게시물이 없어요" />
      ) : (
        <>
          {/* 게시물/장소 탭도 고정 — 카운트는 각 목록 응답의 totalElements 가 채운다. */}
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

          {/* 목록만 내부에서 스크롤한다 — 이 래퍼가 없으면 fixed 컨테이너 안에서
              넘친 콘텐츠를 스크롤할 방법이 없다. */}
          <div
            className="flex-1 overflow-y-auto"
            // 선택 모드에선 CTA 바가 flex 형제로 자리를 차지해 탭바 몫의 패딩이 필요 없다.
            style={{
              paddingBottom: selecting ? '1.25rem' : `calc(1.25rem + ${BOTTOM_MENU_HEIGHT})`,
            }}
          >
            {activeTab === 'posts' ? (
              <div className="grid grid-cols-2 gap-x-2 gap-y-5 px-4 pt-4">
                {posts?.map((post) => (
                  <CollectionCard
                    key={post.id}
                    group={post}
                    selected={selecting ? selectedPostIds.has(post.id) : undefined}
                    onClick={
                      selecting
                        ? () => togglePostSelected(post.id)
                        : () => navigate(`/post/${post.id}`)
                    }
                  />
                ))}
              </div>
            ) : places?.length === 0 ? (
              <GroupEmpty message="저장한 장소가 없어요" />
            ) : (
              // 게시물 탭과 같은 2열 그리드 — 카드도 최근 저장한 공간 바텀시트와 같은
              // 세로형 장소 카드(PlaceCard)를 쓴다.
              <div className="grid grid-cols-2 gap-x-2 gap-y-5 px-4 pt-4">
                {places?.map((place) => (
                  <PlaceCard
                    key={place.id}
                    place={place}
                    // 장소 상세는 지도 화면이 소유한다 — 연관 장소 클릭과 같은 딥링크.
                    onClick={() => navigate(`/map?placeId=${place.id}`)}
                  />
                ))}
              </div>
            )}
            {/* 다음 페이지 트리거. 마지막 페이지면 관찰 대상이 없어 아무 일도 하지 않는다. */}
            <div ref={sentinelRef} aria-hidden="true" className="h-1" />
          </div>

          {/* 선택 모드 CTA — 숨긴 하단 탭바 자리를 대신 차지한다 (Figma `Button_Primary_52`). */}
          {selecting ? (
            <div
              className="shrink-0 bg-gray-0 p-4"
              style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
            >
              <Button
                size="lg"
                fullWidth
                disabled={selectedPostIds.size === 0 || deleteGroupPosts.isPending}
                onClick={() => setDeletePostsPopupOpen(true)}
              >
                {selectedPostIds.size > 0 ? `${selectedPostIds.size}개 삭제하기` : '삭제하기'}
              </Button>
            </div>
          ) : null}
        </>
      )}

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
          deleteGroupPosts.mutate([...selectedPostIds], {
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
          deleteGroup.mutate(group.id, {
            onSuccess: () => navigate('/group', { replace: true }),
          })
        }
      />
    </main>
  );
}
