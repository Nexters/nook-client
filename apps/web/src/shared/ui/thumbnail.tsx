import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';
import emptyThumbnailSm from '@/assets/images/60_Thumbnail.svg';
import { Icon16ExclamationCircle } from '@/shared/icons/NookIcons';
import { cn } from '@/shared/lib/utils';

/**
 * Figma `Thumbnail/98_Group`(Default/Empty/Plus) + `Thumbnail/60_img_x` 기준.
 *
 * 시안은 크기별로 컴포넌트가 나뉘어 있지만 구성이 같아 하나로 합치고 size 로 나눴다.
 * 상태는 prop 조합에서 파생된다 —
 *   Default = src 있음        Empty = src 없음(플레이스홀더)
 *   Plus    = src + overflowCount(딤 + "+N")
 */
const thumbnailVariants = cva(
  'relative shrink-0 overflow-hidden rounded-sm border border-gray-20 bg-gray-10',
  {
    variants: {
      size: {
        /** Thumbnail/98_Group */
        lg: 'size-[98px]',
        /** Thumbnail/60_img_x */
        sm: 'size-16',
      },
    },
    defaultVariants: {
      size: 'lg',
    },
  },
);

/**
 * src 가 없을 때 sm 에서만 채우는 기본 도형(`60_Thumbnail`) — `GroupCard`의 빈 그룹
 * 칸(Figma `Thumbnail/98_Group > Empty`) 전용이다. lg 는 이미지 없이 컨테이너의
 * 회색 배경(`bg-gray-10`)만 보여준다 — 실제 목데이터 스크린샷을 폴백으로 박아두면
 * 썸네일이 없는 진짜 게시물에도 그 가짜 사진이 그대로 노출돼버린다.
 */
const EMPTY_IMAGE_SM = emptyThumbnailSm;

export interface ThumbnailProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'>,
    VariantProps<typeof thumbnailVariants> {
  src?: string;
  alt?: string;
  /** 넘기면 딤 위에 `+N` 을 얹는다 (시안 Property 1=Plus). */
  overflowCount?: number;
  /** 넘기면 딤 위에 로딩 스피너를 얹는다 — 콘텐츠가 아직 처리 중이라 비어 있는 카드용. */
  loading?: boolean;
  /** 넘기면 딤 위에 실패 표시를 얹는다 — 처리(크롤링·파싱)가 실패해 비어 있는 카드용. */
  failed?: boolean;
}

function Thumbnail({
  src,
  alt = '',
  overflowCount,
  loading = false,
  failed = false,
  size = 'lg',
  className,
  ...props
}: ThumbnailProps) {
  const resolvedSrc = src ?? (size === 'sm' ? EMPTY_IMAGE_SM : undefined);

  return (
    <div data-slot="thumbnail" className={cn(thumbnailVariants({ size }), className)} {...props}>
      {resolvedSrc ? (
        <img src={resolvedSrc} alt={src ? alt : ''} className="size-full object-cover" />
      ) : null}
      {overflowCount !== undefined ? (
        <span className="absolute inset-0 flex items-center justify-center bg-black/50 font-mono text-e2 text-gray-0">
          +{overflowCount}
        </span>
      ) : null}
      {loading ? (
        <span
          role="status"
          aria-label="처리 중"
          className="absolute inset-0 flex items-center justify-center bg-gray-0/70"
        >
          <span
            aria-hidden="true"
            className="size-6 animate-spin rounded-full border-2 border-gray-30 border-t-gray-90"
          />
        </span>
      ) : null}
      {failed ? (
        <span
          role="status"
          aria-label="처리 실패"
          className="absolute inset-0 flex items-center justify-center bg-gray-0/80"
        >
          <Icon16ExclamationCircle />
        </span>
      ) : null}
    </div>
  );
}

export { Thumbnail, thumbnailVariants };
