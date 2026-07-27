import { useNavigate, useParams } from 'react-router-dom';
import { useHideBottomMenu } from '@/app/bottom-menu-visibility';
import { Icon32Edit } from '@/shared/icons/NookIcons';
import { BackButton, Badge, COLOR_BG_CLASS, Header, ShareButton } from '@/shared/ui';
import { CollectionCard } from './components/CollectionCard';
import { GroupEmpty } from './components/GroupEmpty';
// TODO(api): 그룹 상세/게시물 API 연동 시 목데이터 대신 TanStack Query 훅으로 교체한다.
import { getMockGroup, getMockGroupPosts } from './mock/groups';

/** Figma `그룹 > 그룹 상세` (기본 / 빈 그룹). */
export function GroupDetailPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  useHideBottomMenu();

  const group = getMockGroup(groupId);
  const posts = getMockGroupPosts(groupId);

  if (!group) {
    return (
      <main className="min-h-dvh bg-gray-0" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <Header left={<BackButton />} />
        <GroupEmpty message="그룹을 찾을 수 없어요" />
      </main>
    );
  }

  return (
    <main
      className="min-h-dvh bg-gray-0"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))',
      }}
    >
      {/* TODO(api): 공유는 링크 스펙 확정 후 native share 로 연결한다. */}
      <Header left={<BackButton />} right={<ShareButton />} />

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
            <Icon32Edit size={28} />
          </button>
        </div>
        {group.ownerName ? (
          <p className="font-mono text-e2 text-gray-60">by {group.ownerName}</p>
        ) : null}
      </div>

      {posts.length === 0 ? (
        <GroupEmpty message="아직 저장한 게시물이 없어요" />
      ) : (
        <div className="grid grid-cols-2 gap-2 px-4 pt-4">
          {posts.map((post) => (
            <CollectionCard
              key={post.id}
              group={post}
              onClick={() => navigate(`/post/${post.id}`)}
            />
          ))}
        </div>
      )}
    </main>
  );
}
