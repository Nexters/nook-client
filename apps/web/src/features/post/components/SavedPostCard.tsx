import type * as React from 'react';
import type { PostArchive } from '@/features/post/types';
import { isVideoUrl } from '@/shared/lib/media';
import { cn } from '@/shared/lib/utils';
import { ArchiveTag, Carousel, Media, Thumbnail } from '@/shared/ui';
import type { Post } from '../types';
import { ExpandableCaption } from './ExpandableCaption';
import { OriginalPostLink } from './OriginalPostLink';

/**
 * Figma `저장된 게시물`.
 * 게시물 상세 카드 — 제목 + 저장된 아카이브/공유자 + 미디어 + 본문 + 원본 링크.
 *
 * 미디어 줄은 장수에 따라 시안이 갈린다(8월 21일 작업).
 *   여러 개(177:24457) — 140x175 를 가로로 늘어놓고 화면(343)을 넘기므로 공용 `Carousel`
 *     (네이티브 scroll-snap)에 얹는다. 점 인디케이터는 두지 않는다(`indicator={false}`)
 *     — 인디케이터가 있는 건 독립 `캐러셀` 쪽이다.
 *   단일 이미지(177:23309) — 343x212 박스 안에 167x208 썸네일을 가운데 둔다. 세로 사진이
 *     한 장뿐일 때 폭을 억지로 채우지 않으려는 시안 의도라, 박스와 썸네일이 따로 있다.
 *   단일 영상(177:23190) — 같은 343x212 를 `cover` 로 꽉 채운다. 잘리는 건 시안대로 둔다.
 *
 * 본문은 `ExpandableCaption` 에 맡긴다 — 게시물 상세와 같이 "더보기"로 펼치고,
 * 펼친 뒤엔 "접기" 버튼이나 본문을 눌러 접는다. 여기선 2줄로 접는다.
 */
/** 단일 미디어가 앉는 프레임. 375 폭 기준 343x212 를 비율로 고정한다. */
const SINGLE_FRAME = 'aspect-[343/212] w-full';

/**
 * 단일 미디어를 감싸는 껍데기. `onImageClick` 이 없으면 버튼이 아니라 그냥 `div` 로 남는다 —
 * 아무 일도 하지 않는 버튼은 스크린리더에 잡히고 포커스만 먹는다.
 */
function MediaButton({
  index,
  onImageClick,
  className,
  children,
}: {
  index: number;
  onImageClick?: (index: number) => void;
  className?: string;
  children: React.ReactNode;
}) {
  if (!onImageClick) return <div className={className}>{children}</div>;

  return (
    <button
      type="button"
      aria-label={`${index + 1}번째 사진 크게 보기`}
      onClick={() => onImageClick(index)}
      className={cn(
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100',
        className,
      )}
    >
      {children}
    </button>
  );
}

export interface SavedPostCardProps {
  post: Post;
  /** 이 게시물이 저장된 아카이브들 (표시용 이름/색만 받는다). 여러 아카이브에 저장될 수 있다. */
  archives: PostArchive[];
  /** 카드 상단 제목. `null` 이면 제목 줄을 그리지 않는다(화면 헤더가 이미 같은 말을 할 때). */
  title?: React.ReactNode;
  /** 넘기면 아카이브 태그가 버튼이 된다 — 게시물 상세와 같이 그 아카이브 상세로 보낼 때 쓴다. */
  onArchiveClick?: (archiveId: number) => void;
  /**
   * 넘기면 미디어가 버튼이 된다 — 누른 위치를 준다(`SavedPostPreview` 확대 뷰).
   * 오버레이 열림 상태는 사용처가 갖는다(확대 뷰 제목인 게시물 제목을 이 카드는 모른다).
   */
  onImageClick?: (index: number) => void;
  className?: string;
}

function SavedPostCard({
  post,
  archives,
  title = '저장된 게시물',
  onArchiveClick,
  onImageClick,
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

      {images.length === 1 ? (
        // 미디어 아래 본문까지 12px — 여러 장일 때의 pb-3 과 같은 간격이다.
        <div className="w-full pb-3">
          <MediaButton index={0} onImageClick={onImageClick} className={SINGLE_FRAME}>
            {isVideoUrl(images[0]) ? (
              // 영상은 프레임을 꽉 채우고 잘리는 대로 둔다 — 원본을 축소해 맞추지 않는다.
              <Media src={images[0]} className="size-full rounded-sm object-cover" />
            ) : (
              // 이미지는 잘리지 않게 167:208 썸네일로 가운데에 앉힌다. 박스의 테두리·배경은
              // `Thumbnail` 이 이미 갖고 있는 것과 같은 토큰이다.
              <span className="flex size-full items-center justify-center rounded-sm border border-gray-20 bg-gray-10">
                <Thumbnail src={images[0]} className="aspect-[167/208] h-full w-auto" />
              </span>
            )}
          </MediaButton>
        </div>
      ) : images.length > 1 ? (
        <div className="w-full pb-3">
          {/* 스크롤 영역만 부모의 좌우 16px 여백 밖으로 뺀다 — 넘기는 중인 이미지는 화면
              끝까지 이어지고, 첫/마지막 이미지의 여백은 ml-4/mr-4 가 대신 만든다
              (게시물 상세의 이미지 캐러셀과 같은 방식).
              `w-auto` 는 Carousel 기본 `w-full` 을 덮는다 — width 가 고정이면 음수 마진이
              폭을 넓히지 못하고 왼쪽으로 밀리기만 한다. */}
          <Carousel indicator={false} className="-mx-4 w-auto">
            {images.map((src, index) => {
              const Slide = onImageClick ? 'button' : 'div';
              return (
                <Slide
                  // 이미지 URL 은 중복될 수 있고 순서가 고정이라 위치를 key 로 쓴다.
                  // biome-ignore lint/suspicious/noArrayIndexKey: 고정 순서 목록
                  key={index}
                  {...(onImageClick
                    ? {
                        type: 'button' as const,
                        onClick: () => onImageClick(index),
                        'aria-label': `${index + 1}번째 사진 크게 보기`,
                      }
                    : {})}
                  className={cn(
                    'h-[175px] w-35 overflow-hidden rounded-sm',
                    index === 0 && 'ml-4',
                    index === images.length - 1 && 'mr-4',
                    onImageClick &&
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100',
                  )}
                >
                  {/* 캐러셀에서는 영상도 첫 프레임만 — 재생은 확대 뷰에서 한다. */}
                  <Media src={src} className="size-full object-cover" />
                </Slide>
              );
            })}
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
