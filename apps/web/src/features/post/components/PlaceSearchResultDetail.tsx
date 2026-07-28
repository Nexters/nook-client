import type { Place } from '@/features/place';
import { PlaceDetailHeader } from '@/features/place';
import type { Post } from '@/features/post';
import { cn } from '@/shared/lib/utils';
import { Button, Carousel, DrawerFooter } from '@/shared/ui';

export interface PlaceSearchResultDetailProps {
  place: Place;
  /** 이 장소에 매핑된 게시물 — 각 항목의 대표 이미지(`images[0]`)를 썸네일로 쓴다. */
  posts: Post[];
  /** collapsed 면 가로 스크롤 캐러셀, expanded 면 2열 그리드로 게시물을 보여준다. */
  expanded: boolean;
  onSelectPost: (post: Post) => void;
  onConfirm: () => void;
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
 * 하단 "이 장소가 맞나요? / 추가하기" 바는 `DrawerFooter`(mt-auto)로 스크롤 영역과
 * 분리해 항상 바닥에 붙인다.
 */
function PlaceSearchResultDetail({
  place,
  posts,
  expanded,
  onSelectPost,
  onConfirm,
}: PlaceSearchResultDetailProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4">
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

      <DrawerFooter className="flex-row items-center gap-2.5 border-t border-gray-10 p-4">
        <p className="flex-1 text-b2 font-semibold text-gray-80">이 장소가 맞나요?</p>
        <Button size="md" onClick={onConfirm} className="flex-1">
          추가하기
        </Button>
      </DrawerFooter>
    </div>
  );
}

export { PlaceSearchResultDetail };
