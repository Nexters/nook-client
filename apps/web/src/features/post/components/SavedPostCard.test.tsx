import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Post } from '../types';
import { SavedPostCard } from './SavedPostCard';

/**
 * 미디어 줄이 장수와 종류에 따라 셋으로 갈린다(Figma 8월 21일 작업) — 단일 이미지는
 * 잘리지 않게 167:208 썸네일로, 단일 영상은 343:212 를 꽉 채워 잘리는 대로, 여러 개는
 * 140x175 캐러셀로. jsdom 은 레이아웃을 계산하지 않으므로 DOM 구조와 클래스까지만 본다.
 */
const IMAGE_URL = 'https://cdn.example.com/posts/1.jpg';
const VIDEO_URL = 'https://cdn.example.com/posts/1.mp4?token=abc';

function makePost(images: string[]): Post {
  return { id: '1', authorHandle: '@nook.official on instagram', images };
}

function mediaFrame(container: HTMLElement) {
  return container.querySelector('[class*="aspect-[343/212]"]');
}

describe('SavedPostCard', () => {
  it('단일 이미지는 343:212 안에 167:208 썸네일로 앉힌다', () => {
    const { container } = render(<SavedPostCard post={makePost([IMAGE_URL])} archives={[]} />);

    expect(mediaFrame(container)).not.toBeNull();
    expect(container.querySelector('[class*="aspect-[167/208]"]')).not.toBeNull();
    expect(container.querySelector('img')).toHaveAttribute('src', IMAGE_URL);
  });

  it('단일 영상은 같은 343:212 를 cover 로 채운다', () => {
    const { container } = render(<SavedPostCard post={makePost([VIDEO_URL])} archives={[]} />);

    expect(mediaFrame(container)).not.toBeNull();
    // 이미지 쪽 썸네일 틀을 타지 않는다 — 잘리는 대로 두는 게 시안이다.
    expect(container.querySelector('[class*="aspect-[167/208]"]')).toBeNull();
    // 카드 자리라 재생하지 않는다 — `Media` 가 첫 프레임(`#t=0.001`)만 보여준다.
    const video = container.querySelector('video');
    expect(video?.getAttribute('src')).toContain(VIDEO_URL);
    expect(video).not.toHaveAttribute('controls');
  });

  it('여러 개면 단일 프레임 대신 캐러셀로 늘어놓는다', () => {
    const { container } = render(
      <SavedPostCard post={makePost([IMAGE_URL, VIDEO_URL])} archives={[]} />,
    );

    expect(mediaFrame(container)).toBeNull();
    expect(container.querySelectorAll('img')).toHaveLength(1);
    expect(container.querySelectorAll('video')).toHaveLength(1);
  });

  it('onImageClick 을 넘겼을 때만 미디어가 버튼이 되고 누른 위치를 알려준다', () => {
    const onImageClick = vi.fn();
    const { rerender } = render(
      <SavedPostCard post={makePost([IMAGE_URL, VIDEO_URL])} archives={[]} />,
    );
    // 아무 일도 하지 않는 버튼은 포커스만 먹고 스크린리더에도 잡힌다.
    expect(screen.queryByRole('button', { name: /사진 크게 보기/ })).not.toBeInTheDocument();

    rerender(
      <SavedPostCard
        post={makePost([IMAGE_URL, VIDEO_URL])}
        archives={[]}
        onImageClick={onImageClick}
      />,
    );
    screen.getByRole('button', { name: '2번째 사진 크게 보기' }).click();
    expect(onImageClick).toHaveBeenCalledWith(1);
  });
});
