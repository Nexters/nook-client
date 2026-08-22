import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PostImageViewer } from '@/features/post/components/PostImageViewer';

/** 헤더의 뒤로가기 버튼이 라우터를 쓰므로 감싸 준다. */
function renderViewer(images: string[]) {
  return render(
    <MemoryRouter>
      <PostImageViewer images={images} onClose={vi.fn()} />
    </MemoryRouter>,
  );
}

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
    const { container } = renderViewer(['a.jpg']);
    const box = photoBox(container);

    expect(box).not.toBeNull();
    expect(box?.style.translate).toContain('-50%');
  });

  it('가운데 보정이 클래스와 인라인으로 나뉘어 있지 않다', () => {
    const { container } = renderViewer(['a.jpg']);
    const box = photoBox(container);

    // 클래스로도 -50% 를 걸어두면 인라인이 덮어써서 조용히 사라진다.
    expect(box?.className).not.toMatch(/translate-y-/);
  });

  it('사진마다 슬라이드를 렌더링한다', () => {
    const { container } = renderViewer(['a.jpg', 'b.jpg', 'c.jpg']);

    expect(container.querySelectorAll('img')).toHaveLength(3);
  });

  it('영상 URL 은 재생 컨트롤이 붙은 video 로 그린다', () => {
    const { container } = renderViewer(['a.mp4']);

    expect(container.querySelector('video')).toHaveAttribute('controls');
  });
});
