import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';
import emptyThumbnailSm from '@/assets/images/60_Thumbnail.svg';
import emptyThumbnailLg from '@/assets/images/ex_Thumbnail.png';
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
 * src 가 없을 때 채울 기본 이미지. 크기별로 애셋이 따로 있다 —
 * sm 은 64px 전용 도형(`60_Thumbnail`), lg 는 큰 칸에서 도형이 늘어나 보이지 않도록
 * 사진 애셋(`ex_Thumbnail`)을 쓴다.
 */
const EMPTY_IMAGE = {
  lg: emptyThumbnailLg,
  sm: emptyThumbnailSm,
} as const;

export interface ThumbnailProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'>,
    VariantProps<typeof thumbnailVariants> {
  src?: string;
  alt?: string;
  /** 넘기면 딤 위에 `+N` 을 얹는다 (시안 Property 1=Plus). */
  overflowCount?: number;
}

function Thumbnail({
  src,
  alt = '',
  overflowCount,
  size = 'lg',
  className,
  ...props
}: ThumbnailProps) {
  return (
    <div data-slot="thumbnail" className={cn(thumbnailVariants({ size }), className)} {...props}>
      <img
        src={src ?? EMPTY_IMAGE[size ?? 'lg']}
        alt={src ? alt : ''}
        className="size-full object-cover"
      />
      {overflowCount !== undefined ? (
        <span className="absolute inset-0 flex items-center justify-center bg-black/50 font-mono text-e2 text-gray-0">
          +{overflowCount}
        </span>
      ) : null}
    </div>
  );
}

export { Thumbnail, thumbnailVariants };
