import { useNavigate, useParams } from 'react-router-dom';
import { useHideBottomMenu } from '@/app/bottom-menu-visibility';
import { PinnedHeaderLayout } from '@/app/layouts/PinnedHeaderLayout';
import { toDisplayPost } from '@/features/map/lib/placePost';
import { SavedPostCard } from '@/features/post';
import { usePostDetails } from '@/features/post/api/queries';
import { BackButton, Header } from '@/shared/ui';
import { usePlaceDetail } from './api/queries';

/**
 * Figma `8월 19일 작업 > 게시물 상세`(165:20588).
 *
 * 한 장소에 저장된 게시물이 여러 건이면 장소 시트에 다 담을 수 없어 이 페이지로 뺀다 —
 * 시트의 "저장된 게시물 N >" 헤더가 여기로 보낸다(`PlaceDetail` 의 `SavedPostsSection`).
 * 카드는 시트와 같은 `SavedPostCard` 지만 제목 줄은 헤더가 대신하므로 끈다(`title={null}`).
 */
export function PlacePostsPage() {
  const { placeId: placeIdParam } = useParams();
  const placeId = placeIdParam ? Number(placeIdParam) : null;
  const navigate = useNavigate();
  useHideBottomMenu();

  const placeQuery = usePlaceDetail(placeId !== null && Number.isFinite(placeId) ? placeId : null);
  const posts = placeQuery.data?.posts ?? [];
  const postDetailQueries = usePostDetails(posts.map((post) => post.id));

  return (
    <PinnedHeaderLayout header={<Header left={<BackButton />} title="저장된 게시물" />}>
      {placeQuery.isError ? (
        <p className="pt-10 text-center text-b2 text-gray-60">게시물을 불러오지 못했어요</p>
      ) : (
        // 카드 사이는 시트의 섹션 구분과 같은 6px 회색 띠 — 흰 카드 사이 간격을 회색 배경이 채운다.
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
        </div>
      )}
    </PinnedHeaderLayout>
  );
}
