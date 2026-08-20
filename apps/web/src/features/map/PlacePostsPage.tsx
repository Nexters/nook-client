import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useHideBottomMenu } from '@/app/bottom-menu-visibility';
import { PinnedHeaderLayout } from '@/app/layouts/PinnedHeaderLayout';
import { toDisplayPost } from '@/features/map/lib/placePost';
import { SavedPostCard, SavedPostPreview } from '@/features/post';
import { usePostDetails } from '@/features/post/api/queries';
import { useHistoryBackedFlag } from '@/shared/lib/useHistoryBackedFlag';
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
  // 카드의 사진을 누르면 그 사진부터 확대 뷰를 얹는다(Figma `전체 보기`) — 장소 상세와 같다.
  // 어느 사진인지는 컴포넌트 state 로 들고, 떠 있는지 여부만 히스토리 엔트리로 승격한다 —
  // 뒤로가기 버튼·하드웨어 백·iOS 엣지 스와이프가 모두 "확대 뷰 닫기"로 수렴해야 한다.
  const [preview, setPreview] = useState<{ postIndex: number; imageIndex: number } | null>(null);
  const [previewOpen, openPreview, closePreview] = useHistoryBackedFlag('savedPostPreview');
  const previewPost = preview ? posts[preview.postIndex] : undefined;
  const previewDetail = preview ? postDetailQueries[preview.postIndex]?.data : undefined;

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
                onImageClick={(imageIndex) => {
                  setPreview({ postIndex: index, imageIndex });
                  openPreview();
                }}
              />
            </div>
          ))}
          <div ref={sentinelRef} aria-hidden="true" className="h-1" />
        </div>
      )}

      {previewOpen && preview && previewPost ? (
        <SavedPostPreview
          title={previewDetail?.title ?? previewPost.title}
          post={toDisplayPost(previewPost, previewDetail)}
          initialIndex={preview.imageIndex}
          onClose={closePreview}
        />
      ) : null}
    </PinnedHeaderLayout>
  );
}
