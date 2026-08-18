import { useNavigate, useParams } from 'react-router-dom';
import { useHideBottomMenu } from '@/app/bottom-menu-visibility';
import { PinnedHeaderLayout } from '@/app/layouts/PinnedHeaderLayout';
import { toDisplayPost } from '@/features/map/lib/placePost';
import { SavedPostCard } from '@/features/post';
import { usePostDetails } from '@/features/post/api/queries';
import { useInfiniteScrollSentinel } from '@/shared/lib/useInfiniteScrollSentinel';
import { BackButton, Header } from '@/shared/ui';
import { usePlacePosts } from './api/queries';

export function PlacePostsPage() {
  const { placeId: placeIdParam } = useParams();
  const placeId = placeIdParam ? Number(placeIdParam) : null;
  const navigate = useNavigate();
  useHideBottomMenu();

  const postsQuery = usePlacePosts(placeId !== null && Number.isFinite(placeId) ? placeId : null);
  const posts = postsQuery.data?.posts ?? [];
  const postDetailQueries = usePostDetails(posts.map((post) => post.id));
  const sentinelRef = useInfiniteScrollSentinel(postsQuery);

  return (
    <PinnedHeaderLayout header={<Header left={<BackButton />} title="저장된 게시물" />}>
      {postsQuery.isError ? (
        <p className="pt-10 text-center text-b2 text-gray-60">게시물을 불러오지 못했어요</p>
      ) : (
        <div className="flex flex-col gap-1.5 bg-gray-10">
          {posts.map((post, index) => (
            <div key={post.id} className="bg-gray-0 px-4">
              <SavedPostCard
                title={null}
                post={toDisplayPost(post, postDetailQueries[index]?.data)}
                archives={postDetailQueries[index]?.data?.archives ?? []}
                onArchiveClick={(archiveId) => navigate(`/archive/${archiveId}`)}
              />
            </div>
          ))}
          <div ref={sentinelRef} aria-hidden="true" className="h-1" />
        </div>
      )}
    </PinnedHeaderLayout>
  );
}
