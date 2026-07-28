import type { Place } from '@/features/place';
import { PlaceDetailHeader } from '@/features/place';
import type { Post } from '@/features/post';
import { cn } from '@/shared/lib/utils';
import { Carousel } from '@/shared/ui';

export interface PlaceSearchResultDetailProps {
  place: Place;
  /** 이 장소에 매핑된 게시물 — 각 항목의 대표 이미지(`images[0]`)를 썸네일로 쓴다. */
  posts: Post[];
  /** collapsed 면 가로 스크롤 캐러셀, expanded 면 2열 그리드로 게시물을 보여준다. */
  expanded: boolean;
  onSelectPost: (post: Post) => void;
}

function PostThumbnailButton({
  post,
  onClick,
  className,
}: {
  post: Post;
  onClick: () => void;
  className?: string;
}) {
  const cover = post.images?.[0];
  return (
    <button
      type="button"
      aria-label="게시물 크게 보기"
      onClick={onClick}
      className={cn(
        'overflow-hidden rounded-sm bg-gray-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100 focus-visible:ring-inset',
        className,
      )}
    >
      {cover ? <img src={cover} alt="" className="size-full object-cover" /> : null}
    </button>
  );
}

/**
 * Figma `장소 바텀시트`(74:3748 collapsed / 74:3623 expanded) — 검색 결과 상세.
 *
 * 헤더(이름/업종/지형지물/키워드)는 기존에 있었지만 실사용처가 없던
 * `PlaceDetailHeader` 를 그대로 쓴다. 매핑된 게시물은 collapsed 에서는 가로
 * 캐러셀(각 카드 = 게시물 1개의 대표 이미지), expanded 에서는 2열 그리드로
 * 레이아웃만 바뀐다 — 게시물 목록 자체는 동일하다.
 *
 * 하단 "이 장소가 맞나요? / 추가하기" 바는 이 컴포넌트가 아니라 `PlaceDirectInputDrawer`가
 * 그린다 — vaul 의 snapPoints 는 드로어 엘리먼트 전체를 transform 으로 밀어 올려/내려
 * 스냅을 표현하는데, 그 안에 있는 자식은(설령 `mt-auto`/`sticky`를 써도) collapsed 스냅에서
 * 화면 밖(엘리먼트의 실제 바닥, 즉 full 스냅 기준 바닥)으로 같이 밀려나 버린다. 항상
 * 화면에 보여야 하는 바는 그 transform 밖, 뷰포트 기준 `fixed` 로 따로 그려야 한다
 * (Figma 시안도 실제로 시트와 겹치는 별도 레이어로 되어 있다).
 */
function PlaceSearchResultDetail({
  place,
  posts,
  expanded,
  onSelectPost,
}: PlaceSearchResultDetailProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* 하단 fixed 바에 가리지 않도록 스크롤 영역 자체에 여유 패딩을 둔다. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-20">
        <PlaceDetailHeader place={place} className="pt-4 pb-4" />

        {posts.length > 0 ? (
          expanded ? (
            <div className="grid grid-cols-2 gap-2 pb-4">
              {posts.map((post) => (
                <PostThumbnailButton
                  key={post.id}
                  post={post}
                  onClick={() => onSelectPost(post)}
                  className="aspect-[160/200] w-full"
                />
              ))}
            </div>
          ) : (
            <Carousel indicator={false} className="pb-4">
              {posts.map((post) => (
                <PostThumbnailButton
                  key={post.id}
                  post={post}
                  onClick={() => onSelectPost(post)}
                  className="h-[175px] w-35"
                />
              ))}
            </Carousel>
          )
        ) : null}
      </div>
    </div>
  );
}

export { PlaceSearchResultDetail };
