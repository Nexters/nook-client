import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';
import emptyThumbnailLg from '@/assets/images/98_Group.svg';
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
        /** 칸 너비를 채우는 정사각형 — 화면 폭에 따라 늘어나는 그리드용. */
        fluid: 'aspect-square w-full',
      },
    },
    defaultVariants: {
      size: 'lg',
    },
  },
);

/** src 가 없을 때 썸네일을 채우는 기본 도형 — 모든 크기가 같은 고스트를 쓴다. */
const EMPTY_IMAGE = emptyThumbnailLg;

export interface ThumbnailProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'>,
    VariantProps<typeof thumbnailVariants> {
  src?: string;
  alt?: string;
  /** 넘기면 딤 위에 `+N` 을 얹는다 (시안 Property 1=Plus). */
  overflowCount?: number;
  /**
   * 콘텐츠가 아직 처리 중이라 비어 있는 카드용 — src 유무와 무관하게 기본(고스트)
   * 이미지를 그대로 보여준다(Figma). 처리 결과 문구·아이콘은 카드가 이름 자리에
   * 직접 그린다(`게시글 불러오는 중...`) — 여기선 썸네일 자체엔 오버레이를 얹지 않는다.
   */
  loading?: boolean;
  /**
   * 처리(크롤링·파싱)가 실패한 카드용 — 로딩과 같은 고스트 기본 이미지를 그대로
   * 보여준다(Figma). 문구·아이콘은 마찬가지로 카드가 이름 자리에 그린다.
   */
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
  // loading/failed 는 src 가 남아 있어도(재처리 중 등) 고스트로 강제한다.
  const showingRealImage = !loading && !failed && Boolean(src);
  const resolvedSrc = showingRealImage ? src : EMPTY_IMAGE;

  return (
    <div data-slot="thumbnail" className={cn(thumbnailVariants({ size }), className)} {...props}>
      <img
        src={resolvedSrc}
        alt={showingRealImage ? alt : ''}
        // 고스트는 실제 사진과 달리 상자를 꽉 채우려는 그림이 아니라, 상자 비율과
        // 무관하게 제 비율대로 안에 들어가야 한다 — object-cover 로 채우면 잘려서
        // 과하게 확대돼 보인다(실제 사진만 cover 로 채운다). SVG 자체 여백(뷰박스
        // 안에서 도형이 차지하는 비율)이 이미 있어 별도 padding 은 더하지 않는다.
        className={cn('size-full', showingRealImage ? 'object-cover' : 'object-contain')}
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
