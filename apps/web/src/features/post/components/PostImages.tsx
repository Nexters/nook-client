import { useEffect, useState } from 'react';
import { isVideoUrl } from '@/shared/lib/media';
import { cn } from '@/shared/lib/utils';
import { Carousel, Media, VideoPlayer } from '@/shared/ui';

/**
 * 게시물 상세의 미디어 영역(이미지·영상).
 *
 * 첫 장의 원본 크기로 프레임 비율을 정하고(세로 240x300 / 가로 240x180 / 정방 240x240),
 * 뒤따르는 이미지는 비율이 달라도 같은 프레임에 `cover` 로 채운다 — 줄 높이가 들쭉날쭉하지
 * 않게 하려는 시안 의도라 프레임은 첫 장 하나로만 결정한다.
 *
 * 단일 미디어는 시안(8월 21일 작업, 177:23840)이 이미지와 영상을 갈라 놓았다 —
 * 이미지는 강제 crop 없이 원본 비율 그대로(가로 100%, 세로 유동), 영상은 343:429 고정
 * 프레임에 `cover` 로 잘라 넣는다. 영상 비율이 제각각이라 프레임을 따라가게 두면 줄 높이가
 * 튀기 때문이다.
 */
const FRAME = {
  portrait: 'aspect-[240/300]',
  landscape: 'aspect-[240/180]',
  square: 'aspect-square',
} as const;

type Frame = keyof typeof FRAME;

/**
 * 첫 장을 미리 읽어 프레임을 고른다. 읽기 전에는 시안 기본값인 세로형으로 둔다.
 * 첫 장이 영상이면 읽지 못해 기본값(세로형)이 그대로 쓰인다 — 영상은 대개 단독이라
 * 프레임 없는 단일 레이아웃으로 빠진다.
 */
function useFrame(src: string | undefined): Frame {
  const [frame, setFrame] = useState<Frame>('portrait');

  useEffect(() => {
    if (!src || isVideoUrl(src)) return;
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

/** 단일 이미지의 크기 — 프레임 없이 원본 비율을 유지한다. */
const SINGLE_CLASS =
  'block h-auto max-h-[min(70dvh,520px)] w-full rounded-sm bg-gray-10 object-contain';

export interface PostImagesProps {
  /** 이미지·영상 URL. 서버 순서(`sequence`)를 그대로 유지한다. */
  images: string[];
  onImageClick: () => void;
  /** 단일 영상의 확대 버튼. 넘기지 않으면 버튼을 그리지 않는다. */
  onVideoExpand?: () => void;
}

function PostImages({ images, onImageClick, onVideoExpand }: PostImagesProps) {
  const frame = useFrame(images[0]);

  if (images.length === 0) return null;

  if (images.length === 1) {
    const src = images[0];

    // 영상은 컨트롤을 직접 눌러야 해서 확대 보기 버튼으로 감싸지 않는다
    // (버튼 안에서 재생 버튼을 누르면 확대 뷰가 같이 열린다) — 확대는 시안대로
    // 프레임 우하단의 자체 버튼이 맡는다.
    if (src && isVideoUrl(src)) {
      return (
        <div className="w-full px-4">
          <VideoPlayer
            src={src}
            onExpand={onVideoExpand}
            className="aspect-[343/429] w-full rounded-sm bg-gray-10"
          />
        </div>
      );
    }

    return (
      <button
        type="button"
        aria-label="이미지 크게 보기"
        onClick={onImageClick}
        // 캐러셀 슬라이드와 같은 좌우 16px 여백.
        className="w-full px-4"
      >
        <Media src={src} className={SINGLE_CLASS} />
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
          onClick={onImageClick}
          // 좌우 16px 여백은 첫/마지막 슬라이드가 만든다 — 스크롤 컨테이너에 padding 을
          // 주면 다음 이미지가 화면 끝까지 이어지지 않고 잘린다(시안은 끝까지 이어진다).
          className={cn(
            'w-60 overflow-hidden rounded-sm',
            FRAME[frame],
            index === 0 && 'ml-4',
            index === images.length - 1 && 'mr-4',
          )}
        >
          {/* 캐러셀에서는 영상도 첫 프레임만 — 재생은 확대 보기(`PostImageViewer`)에서 한다. */}
          <Media src={src} className="size-full object-cover" />
        </button>
      ))}
    </Carousel>
  );
}

export { PostImages };
