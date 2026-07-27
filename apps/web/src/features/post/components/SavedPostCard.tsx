import * as React from 'react';
import { cn } from '@/shared/lib/utils';
import { Carousel, type GroupColor, GroupTag } from '@/shared/ui';
import type { Post } from '../types';
import { OriginalPostLink } from './OriginalPostLink';

/**
 * Figma `저장된 게시물`.
 * 게시물 상세 카드 — 제목 + 저장된 그룹/공유자 + 이미지 캐러셀 + 본문 + 원본 링크.
 *
 * 이미지 줄은 시안이 140x175 를 가로로 늘어놓고 화면(343)을 넘기므로 공용 `Carousel`
 * (네이티브 scroll-snap)에 얹는다. 다만 여기엔 점 인디케이터를 두지 않는다
 * (`indicator={false}`) — 인디케이터가 있는 건 독립 `캐러셀` 쪽이다.
 *
 * 본문은 2줄로 접고 "더보기"로 펼친다 — 펼침 상태는 이 카드가 소유한다.
 */
export interface SavedPostCardProps {
  post: Post;
  /** 이 게시물이 저장된 그룹 (표시용 이름/색만 받는다) */
  groupName: string;
  groupColor: GroupColor;
  /** 카드 상단 제목 */
  title?: string;
  className?: string;
}

function SavedPostCard({
  post,
  groupName,
  groupColor,
  title = '저장된 게시물',
  className,
}: SavedPostCardProps) {
  const [expanded, setExpanded] = React.useState(false);
  const images = post.images ?? [];

  return (
    <div className={cn('flex w-full flex-col overflow-hidden bg-gray-0 pb-1', className)}>
      <div className="flex w-full items-center justify-between pt-4 pb-3">
        <h2 className="text-b1 font-semibold text-gray-100">{title}</h2>
      </div>

      <div className="flex w-full items-center gap-2 pb-3">
        <GroupTag color={groupColor}>{groupName}</GroupTag>
        {post.sharedBy ? (
          <span className="truncate font-mono text-e2 text-gray-60">{post.sharedBy}</span>
        ) : null}
      </div>

      {images.length > 0 ? (
        <div className="w-full pb-3">
          <Carousel indicator={false}>
            {images.map((src, index) => (
              <div
                // 이미지 URL 은 중복될 수 있고 순서가 고정이라 위치를 key 로 쓴다.
                // biome-ignore lint/suspicious/noArrayIndexKey: 고정 순서 목록
                key={index}
                className="h-[175px] w-35 overflow-hidden rounded-sm"
              >
                <img src={src} alt="" className="size-full object-cover" />
              </div>
            ))}
          </Carousel>
        </div>
      ) : null}

      {post.caption ? (
        <div className="flex w-full flex-col">
          <p
            className={cn(
              'text-b2 font-normal text-gray-80',
              expanded ? 'whitespace-pre-wrap' : 'line-clamp-2',
            )}
          >
            {post.caption}
          </p>
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="self-end text-b2 font-semibold text-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100"
          >
            {expanded ? '접기' : '더보기'}
          </button>
        </div>
      ) : null}

      {post.originalUrl ? (
        <div className="w-full py-4">
          <OriginalPostLink label={post.authorHandle} href={post.originalUrl} />
        </div>
      ) : null}
    </div>
  );
}

export { SavedPostCard };
