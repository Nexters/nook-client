import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Post, PostMedia } from '../types';
import { SavedPostCard } from './SavedPostCard';

/**
 * 미디어 줄이 장수와 종류에 따라 셋으로 갈린다(Figma 8월 21일 작업) — 단일 이미지는
 * 잘리지 않게 167:208 썸네일로, 단일 영상은 343:212 를 꽉 채워 잘리는 대로, 여러 개는
 * 140x175 캐러셀로. jsdom 은 레이아웃을 계산하지 않으므로 DOM 구조와 클래스까지만 본다.
 */
const IMAGE_URL = 'https://cdn.example.com/posts/1.jpg';
const VIDEO_URL = 'https://cdn.example.com/posts/1.mp4?token=abc';
const POSTER_URL = 'https://cdn.example.com/posts/1-poster.jpg';

function makePost(media: PostMedia[]): Post {
  return { id: '1', authorHandle: '@nook.official on instagram', media };
}

const asImage = (url: string): PostMedia => ({ url, type: 'IMAGE' });
const asVideo = (url: string, thumbnailUrl?: string): PostMedia => ({
  url,
  thumbnailUrl,
  type: 'VIDEO',
});

function mediaFrame(container: HTMLElement) {
  return container.querySelector('[class*="aspect-[343/212]"]');
}

describe('SavedPostCard', () => {
  it('단일 이미지는 343:212 안에 167:208 썸네일로 앉힌다', () => {
    const { container } = render(
      <SavedPostCard post={makePost([asImage(IMAGE_URL)])} archives={[]} />,
    );

    expect(mediaFrame(container)).not.toBeNull();
    expect(container.querySelector('[class*="aspect-[167/208]"]')).not.toBeNull();
    expect(container.querySelector('img')).toHaveAttribute('src', IMAGE_URL);
  });

  it('포스터 없는 단일 영상은 같은 343:212 를 cover 로 채운다', () => {
    const { container } = render(
      <SavedPostCard post={makePost([asVideo(VIDEO_URL)])} archives={[]} />,
    );

    expect(mediaFrame(container)).not.toBeNull();
    // 이미지 쪽 썸네일 틀을 타지 않는다 — 잘리는 대로 두는 게 시안이다.
    expect(container.querySelector('[class*="aspect-[167/208]"]')).toBeNull();
    // 포스터가 없으면 영상 URL 그대로 — `Media` 가 첫 프레임(`#t=0.001`)만 보여준다.
    const video = container.querySelector('video');
    expect(video?.getAttribute('src')).toContain(VIDEO_URL);
    expect(video).not.toHaveAttribute('controls');
  });

  /**
   * 이번 규칙의 핵심 — 그림은 포스터로 갈아끼우되 **레이아웃은 영상 것**을 유지한다.
   * 포스터가 이미지라고 해서 167:208 틀로 넘어가 버리면 시안과 어긋난다.
   */
  it('포스터가 있는 영상은 포스터를 그리되 영상 레이아웃을 유지한다', () => {
    const { container } = render(
      <SavedPostCard post={makePost([asVideo(VIDEO_URL, POSTER_URL)])} archives={[]} />,
    );

    expect(container.querySelector('video')).toBeNull();
    expect(container.querySelector('img')).toHaveAttribute('src', POSTER_URL);
    expect(mediaFrame(container)).not.toBeNull();
    expect(container.querySelector('[class*="aspect-[167/208]"]')).toBeNull();
  });

  it('여러 개면 단일 프레임 대신 캐러셀로 늘어놓고, 영상은 포스터를 먼저 쓴다', () => {
    const { container } = render(
      <SavedPostCard
        post={makePost([asImage(IMAGE_URL), asVideo(VIDEO_URL, POSTER_URL)])}
        archives={[]}
      />,
    );

    expect(mediaFrame(container)).toBeNull();
    expect(container.querySelectorAll('video')).toHaveLength(0);
    expect([...container.querySelectorAll('img')].map((img) => img.getAttribute('src'))).toEqual([
      IMAGE_URL,
      POSTER_URL,
    ]);
    // 이 카드는 종류 표시를 얹지 않는다 — 아카이브 목록과 장소 상세 타일 전용이다.
    expect(container.querySelector('[data-slot="media-badge"]')).toBeNull();
  });

  it('onImageClick 을 넘겼을 때만 미디어가 버튼이 되고 누른 위치를 알려준다', () => {
    const onImageClick = vi.fn();
    const { rerender } = render(
      <SavedPostCard post={makePost([asImage(IMAGE_URL), asVideo(VIDEO_URL)])} archives={[]} />,
    );
    // 아무 일도 하지 않는 버튼은 포커스만 먹고 스크린리더에도 잡힌다.
    expect(screen.queryByRole('button', { name: /사진 크게 보기/ })).not.toBeInTheDocument();

    rerender(
      <SavedPostCard
        post={makePost([asImage(IMAGE_URL), asVideo(VIDEO_URL)])}
        archives={[]}
        onImageClick={onImageClick}
      />,
    );
    screen.getByRole('button', { name: '2번째 사진 크게 보기' }).click();
    expect(onImageClick).toHaveBeenCalledWith(1);
  });
});
