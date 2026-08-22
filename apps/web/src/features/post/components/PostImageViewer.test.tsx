import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PostImageViewer } from '@/features/post/components/PostImageViewer';
import type { PostMedia } from '@/features/post/types';

/** 헤더의 뒤로가기 버튼이 라우터를 쓰므로 감싸 준다. */
function renderViewer(media: PostMedia[]) {
  return render(
    <MemoryRouter>
      <PostImageViewer media={media} onClose={vi.fn()} />
    </MemoryRouter>,
  );
}

/** 종류는 서버가 알려준다 — 목에서도 URL 확장자로 추측하지 않는다. */
const image = (url: string): PostMedia => ({ url, type: 'IMAGE' });

/** 사진을 감싼 상자 — 세로 가운데 보정과 끌어내린 거리를 함께 갖는다. */
function photoBox(container: HTMLElement) {
  return container.querySelector<HTMLElement>('[class*="top-1/2"]');
}

describe('PostImageViewer', () => {
  /**
   * 회귀 방지 — Tailwind 의 `-translate-y-1/2` 는 CSS `translate` 프로퍼티를 쓴다. 끌어내리는
   * 거리를 인라인 `translate` 로 따로 얹으면 클래스가 통째로 덮여 사진이 화면 절반만큼
   * 아래로 쏟아진다. 두 값은 반드시 한 선언에 같이 있어야 한다.
   */
  it('가운데 보정을 인라인 translate 안에 함께 갖는다', () => {
    const { container } = renderViewer([image('a.jpg')]);
    const box = photoBox(container);

    expect(box).not.toBeNull();
    expect(box?.style.translate).toContain('-50%');
  });

  it('가운데 보정이 클래스와 인라인으로 나뉘어 있지 않다', () => {
    const { container } = renderViewer([image('a.jpg')]);
    const box = photoBox(container);

    // 클래스로도 -50% 를 걸어두면 인라인이 덮어써서 조용히 사라진다.
    expect(box?.className).not.toMatch(/translate-y-/);
  });

  it('사진마다 슬라이드를 렌더링한다', () => {
    const { container } = renderViewer([image('a.jpg'), image('b.jpg'), image('c.jpg')]);

    expect(container.querySelectorAll('img')).toHaveLength(3);
  });

  it('영상은 포스터가 있어도 원본을 재생한다', () => {
    // 크게 보려고 들어온 자리라 포스터로 갈아치우면 안 된다.
    const { container } = renderViewer([
      { url: 'a.mp4', thumbnailUrl: 'poster.jpg', type: 'VIDEO' },
    ]);

    expect(container.querySelector('video')).toHaveAttribute('src', 'a.mp4');
    expect(container.querySelector('img')).toBeNull();
  });
});
