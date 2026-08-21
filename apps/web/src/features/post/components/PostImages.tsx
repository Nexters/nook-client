import { useEffect, useState } from 'react';
import { cn } from '@/shared/lib/utils';
import { Carousel } from '@/shared/ui';

/**
 * 게시물 상세의 이미지 영역.
 *
 * 첫 장의 원본 크기로 프레임 비율을 정하고(세로 240x300 / 가로 240x180 / 정방 240x240),
 * 뒤따르는 이미지는 비율이 달라도 같은 프레임에 `cover` 로 채운다 — 줄 높이가 들쭉날쭉하지
 * 않게 하려는 시안 의도라 프레임은 첫 장 하나로만 결정한다.
 *
 * 단일 이미지는 프레임 없이 원본 비율 그대로 보여준다(`contain`).
 */
const FRAME = {
  portrait: 'aspect-[240/300]',
  landscape: 'aspect-[240/180]',
  square: 'aspect-square',
} as const;

type Frame = keyof typeof FRAME;

/** 첫 장을 미리 읽어 프레임을 고른다. 읽기 전에는 시안 기본값인 세로형으로 둔다. */
function useFrame(src: string | undefined): Frame {
  const [frame, setFrame] = useState<Frame>('portrait');

  useEffect(() => {
    if (!src) return;
    let alive = true;
    const image = new Image();
    image.onload = () => {
      if (!alive) return;
      const ratio = image.naturalWidth / image.naturalHeight;
      // 정확히 1:1 로 떨어지지 않는 정방형 사진이 있어 약간의 여유를 둔다.
      setFrame(ratio > 1.02 ? 'landscape' : ratio < 0.98 ? 'portrait' : 'square');
    };
    image.src = src;
    return () => {
      alive = false;
    };
  }, [src]);

  return frame;
}

export interface PostImagesProps {
  images: string[];
  /** 누른 이미지의 위치를 넘긴다 — 확대뷰가 그 이미지부터 시작해야 한다. */
  onImageClick: (index: number) => void;
}

function PostImages({ images, onImageClick }: PostImagesProps) {
  const frame = useFrame(images[0]);

  if (images.length === 0) return null;

  if (images.length === 1) {
    return (
      <button
        type="button"
        aria-label="이미지 크게 보기"
        onClick={() => onImageClick(0)}
        // 캐러셀 슬라이드와 같은 좌우 16px 여백.
        className="w-full px-4"
      >
        <img
          src={images[0]}
          alt=""
          className="block h-auto max-h-[min(70dvh,520px)] w-full rounded-sm bg-gray-10 object-contain"
        />
      </button>
    );
  }

  return (
    // 여러 장이 동시에 보이는 캐러셀이라 인디케이터가 현재 위치를 가리키지 못한다.
    // 점을 감싸던 py-3 가 하단 여백 노릇을 하고 있었으므로 12px 을 직접 채운다.
    <Carousel indicator={false} className="pb-3">
      {images.map((src, index) => (
        <button
          // 이미지 URL 은 중복될 수 있고 순서가 고정이라 위치를 key 로 쓴다.
          // biome-ignore lint/suspicious/noArrayIndexKey: 고정 순서 목록
          key={index}
          type="button"
          aria-label={`${index + 1}번째 이미지 크게 보기`}
          onClick={() => onImageClick(index)}
          // 좌우 16px 여백은 첫/마지막 슬라이드가 만든다 — 스크롤 컨테이너에 padding 을
          // 주면 다음 이미지가 화면 끝까지 이어지지 않고 잘린다(시안은 끝까지 이어진다).
          className={cn(
            'w-60 overflow-hidden rounded-sm',
            FRAME[frame],
            index === 0 && 'ml-4',
            index === images.length - 1 && 'mr-4',
          )}
        >
          <img src={src} alt="" className="size-full object-cover" />
        </button>
      ))}
    </Carousel>
  );
}

export { PostImages };
