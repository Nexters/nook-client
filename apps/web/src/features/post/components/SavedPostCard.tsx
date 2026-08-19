import type * as React from 'react';
import type { PostArchive } from '@/features/post/types';
import { cn } from '@/shared/lib/utils';
import { ArchiveTag, Carousel } from '@/shared/ui';
import type { Post } from '../types';
import { ExpandableCaption } from './ExpandableCaption';
import { OriginalPostLink } from './OriginalPostLink';

/**
 * Figma `저장된 게시물`.
 * 게시물 상세 카드 — 제목 + 저장된 아카이브/공유자 + 이미지 캐러셀 + 본문 + 원본 링크.
 *
 * 이미지 줄은 시안이 140x175 를 가로로 늘어놓고 화면(343)을 넘기므로 공용 `Carousel`
 * (네이티브 scroll-snap)에 얹는다. 다만 여기엔 점 인디케이터를 두지 않는다
 * (`indicator={false}`) — 인디케이터가 있는 건 독립 `캐러셀` 쪽이다.
 *
 * 본문은 `ExpandableCaption` 에 맡긴다 — 게시물 상세와 같이 "더보기"로 펼치고,
 * 펼친 뒤엔 "접기" 버튼이나 본문을 눌러 접는다. 여기선 2줄로 접는다.
 */
export interface SavedPostCardProps {
  post: Post;
  /** 이 게시물이 저장된 아카이브들 (표시용 이름/색만 받는다). 여러 아카이브에 저장될 수 있다. */
  archives: PostArchive[];
  /** 카드 상단 제목. `null` 이면 제목 줄을 그리지 않는다(화면 헤더가 이미 같은 말을 할 때). */
  title?: React.ReactNode;
  /** 넘기면 아카이브 태그가 버튼이 된다 — 게시물 상세와 같이 그 아카이브 상세로 보낼 때 쓴다. */
  onArchiveClick?: (archiveId: number) => void;
  className?: string;
}

function SavedPostCard({
  post,
  archives,
  title = '저장된 게시물',
  onArchiveClick,
  className,
}: SavedPostCardProps) {
  const images = post.images ?? [];

  return (
    // overflow 를 잘라내지 않는다 — 이미지 줄이 부모 여백 밖으로 나가야 한다(아래 -mx-4).
    <div className={cn('flex w-full flex-col bg-gray-0 pb-1', className)}>
      {title ? (
        <div className="flex w-full items-center justify-between pt-4 pb-3">
          <h2 className="text-b1 font-semibold text-gray-100">{title}</h2>
        </div>
      ) : null}

      {/* 제목 줄이 없으면 그 줄이 갖던 상단 16px 을 이 줄이 대신 받는다. */}
      <div className={cn('flex w-full flex-wrap items-center gap-2 pb-3', !title && 'pt-4')}>
        {archives.map((archive) => (
          <ArchiveTag
            key={archive.id}
            color={archive.color}
            onClick={onArchiveClick ? () => onArchiveClick(archive.id) : undefined}
          >
            {archive.name}
          </ArchiveTag>
        ))}
        {post.sharedBy ? (
          <span className="truncate font-mono text-e2 text-gray-60">{post.sharedBy}</span>
        ) : null}
      </div>

      {images.length > 0 ? (
        <div className="w-full pb-3">
          {/* 스크롤 영역만 부모의 좌우 16px 여백 밖으로 뺀다 — 넘기는 중인 이미지는 화면
              끝까지 이어지고, 첫/마지막 이미지의 여백은 ml-4/mr-4 가 대신 만든다
              (게시물 상세의 이미지 캐러셀과 같은 방식).
              `w-auto` 는 Carousel 기본 `w-full` 을 덮는다 — width 가 고정이면 음수 마진이
              폭을 넓히지 못하고 왼쪽으로 밀리기만 한다. */}
          <Carousel indicator={false} className="-mx-4 w-auto">
            {images.map((src, index) => (
              <div
                // 이미지 URL 은 중복될 수 있고 순서가 고정이라 위치를 key 로 쓴다.
                // biome-ignore lint/suspicious/noArrayIndexKey: 고정 순서 목록
                key={index}
                className={cn(
                  'h-[175px] w-35 overflow-hidden rounded-sm',
                  index === 0 && 'ml-4',
                  index === images.length - 1 && 'mr-4',
                )}
              >
                <img src={src} alt="" className="size-full object-cover" />
              </div>
            ))}
          </Carousel>
        </div>
      ) : null}

      {post.caption ? (
        <ExpandableCaption
          caption={post.caption}
          lines={2}
          toggleClassName="self-end font-semibold"
          className="w-full"
        />
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
