import { cn } from '@/shared/lib/utils';
import { Badge, Carousel } from '@/shared/ui';

/**
 * Figma `업체 정보 > 장소 카드`(126:13548) — 장소 사진 캐러셀.
 *
 * 사진은 대표 썸네일 + `photoUrls`(최대 5장) 로 최대 6장이다. 프레임은 212px 로 고정이고
 * 비율이 다른 사진은 `object-cover` 로 프레임 안쪽만 보여준다(시안이 같은 높이로 늘어선다).
 *
 * 여러 장일 때만 우상단에 `2/6` 사진 태그가 붙는다 — 시안 라벨 "업체 이미지 1장인 경우
 * (장수 태그 X)". 태그를 슬라이드마다 그리면 캐러셀의 현재 인덱스를 밖으로 뺄 필요가 없다.
 *
 * 슬라이드 하나하나가 버튼이다 — 캐러셀 전체를 버튼으로 감싸면 옆으로 넘기는 드래그가
 * 클릭으로 새어 들어간다(`PostImages` 와 같은 이유로 같은 구조를 쓴다).
 */
export interface PlacePhotosProps {
  photos: string[];
  /** 넘기면 사진이 버튼이 된다 — 전체보기(사진 그리드)로 열 때 쓴다. */
  onPhotoClick?: () => void;
  className?: string;
}

const FRAME_CLASS = 'h-[212px] w-full overflow-hidden rounded-sm border border-gray-20 bg-gray-10';

function PlacePhotos({ photos, onPhotoClick, className }: PlacePhotosProps) {
  // 사진이 하나도 없으면 같은 크기의 빈 프레임으로 자리만 잡는다.
  if (photos.length === 0) {
    return <div className={cn(FRAME_CLASS, className)} />;
  }

  const slides = photos.map((src, index) => {
    const Comp = onPhotoClick ? 'button' : 'div';
    return (
      <Comp
        // 사진 URL 은 중복될 수 있고 순서가 고정이라 위치를 key 로 쓴다.
        // biome-ignore lint/suspicious/noArrayIndexKey: 고정 순서 목록
        key={index}
        {...(onPhotoClick
          ? {
              type: 'button' as const,
              onClick: onPhotoClick,
              'aria-label': `${index + 1}번째 사진 크게 보기`,
            }
          : {})}
        className={cn('relative block', FRAME_CLASS)}
      >
        <img src={src} alt="" className="size-full object-cover" />
        {photos.length > 1 ? (
          <Badge variant="photo" className="absolute top-2.5 right-2.5">
            {index + 1}/{photos.length}
          </Badge>
        ) : null}
      </Comp>
    );
  });

  if (photos.length === 1) {
    return <div className={cn('w-full', className)}>{slides[0]}</div>;
  }

  // 슬라이드가 부모 폭(시안 343)을 그대로 채우므로 스냅 좌측 여백을 없앤다.
  return (
    <Carousel padded={false} className={className}>
      {slides}
    </Carousel>
  );
}

export { PlacePhotos };
