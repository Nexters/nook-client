import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useHideBottomMenu } from '@/app/bottom-menu-visibility';
import { Icon32Edit } from '@/shared/icons/NookIcons';
import { BackButton, Badge, COLOR_BG_CLASS, Header } from '@/shared/ui';
import { useGroupPosts, useGroups } from './api/queries';
import { CollectionCard } from './components/CollectionCard';
import { GroupEmpty } from './components/GroupEmpty';

/** Figma `그룹 > 그룹 상세` (기본 / 빈 그룹). */
export function GroupDetailPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  useHideBottomMenu();

  // 상세 전용 API가 아직 없어 목록 캐시에서 고른다.
  const { data: groups, isPending } = useGroups();
  const group = groups?.find((item) => String(item.id) === groupId);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useGroupPosts(group?.id);
  const posts = data?.posts;

  // 그리드 끝(sentinel)이 화면에 들어오면 다음 페이지를 당긴다.
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

  // 헤더를 고정하기 위해 페이지를 앱 셸에 붙이고(fixed inset-0 — 셸의
  // will-change-transform 이 fixed 의 기준을 셸로 잡아준다, GroupFormPage 와 같은
  // 패턴) 콘텐츠만 내부에서 스크롤한다. sticky 는 셸의 overflow-hidden 때문에
  // 기준 스크롤포트가 문서가 아닌 셸로 잡혀 동작하지 않는다.
  return (
    <main
      className="fixed inset-0 flex flex-col bg-gray-0"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* TODO(api): 공유 버튼은 아직 동작이 없어 숨긴다 — 링크 스펙 확정 후
          `right={<ShareButton />}` 로 되살리고 native share 에 연결한다. */}
      <Header left={<BackButton />} />

      {/* 그룹 정보(이름·색·편집)도 헤더와 함께 고정 — 스크롤 영역 밖에 둔다. */}
      <div className="flex flex-col gap-1 border-gray-20 border-b px-4 pb-4">
        <div className="flex items-center gap-2">
          <span className={`size-3 shrink-0 ${COLOR_BG_CLASS[group.color]}`} aria-hidden="true" />
          <h1 className="min-w-0 truncate text-h2 font-semibold text-gray-100">{group.name}</h1>
          <Badge variant="number">{group.placeCount} Places</Badge>
          <button
            type="button"
            aria-label="그룹 편집"
            onClick={() => navigate(`/group/${group.id}/edit`)}
            className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100"
          >
            <Icon32Edit />
          </button>
        </div>
        {data?.ownerNickname ? (
          <p className="font-mono text-e2 text-gray-60">by {data.ownerNickname}</p>
        ) : null}
      </div>

      {posts?.length === 0 ? (
        <GroupEmpty message="아직 저장한 게시물이 없어요" />
      ) : (
        <div className="grid grid-cols-2 gap-x-2 gap-y-5 px-4 pt-4">
          {posts?.map((post) => (
            <CollectionCard
              key={post.id}
              group={post}
              onClick={() => navigate(`/post/${post.id}`)}
            />
          ))}
        </div>
      )}
      {/* 다음 페이지 트리거. 마지막 페이지면 관찰 대상이 없어 아무 일도 하지 않는다. */}
      <div ref={sentinelRef} aria-hidden="true" className="h-1" />
    </main>
  );
}
