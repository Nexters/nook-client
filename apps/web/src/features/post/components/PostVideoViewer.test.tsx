import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PostVideoViewer } from './PostVideoViewer';

function renderViewer() {
  return render(
    <MemoryRouter>
      <PostVideoViewer src="video.mp4" onClose={vi.fn()} />
    </MemoryRouter>,
  );
}

describe('PostVideoViewer', () => {
  it('뒤로가기 버튼을 영상 프레임 좌상단에서 20px 떨어뜨린다', () => {
    const { container } = renderViewer();
    const video = container.querySelector('video');
    const button = screen.getByRole('button', { name: '뒤로 가기' });

    expect(video?.parentElement).toContainElement(button);
    expect(button.className).toContain('top-5');
    expect(button.className).toContain('left-5');
  });

  it('진행바 배경은 흰색이고 채워지는 부분은 검정색이다', () => {
    const { container } = renderViewer();
    const progress = container.querySelector('[data-slot="video-progress"]');

    expect(progress?.parentElement?.className).toContain('bg-gray-0');
    expect(progress?.className).toContain('bg-gray-100');
  });
});
