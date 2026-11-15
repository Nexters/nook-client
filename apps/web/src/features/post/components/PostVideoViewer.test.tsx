import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VideoPlayer } from '@/shared/ui/video-player';
import { PostVideoViewer } from './PostVideoViewer';

beforeEach(() => {
  Object.defineProperty(HTMLMediaElement.prototype, 'paused', {
    configurable: true,
    get(this: HTMLMediaElement & { _paused?: boolean }) {
      return this._paused ?? true;
    },
  });
  HTMLMediaElement.prototype.play = vi.fn(function play(
    this: HTMLMediaElement & { _paused?: boolean },
  ) {
    this._paused = false;
    this.dispatchEvent(new Event('play'));
    return Promise.resolve();
  });
  HTMLMediaElement.prototype.pause = vi.fn(function pause(
    this: HTMLMediaElement & { _paused?: boolean },
  ) {
    this._paused = true;
    this.dispatchEvent(new Event('pause'));
  });
});

function renderViewer() {
  const onClose = vi.fn();
  const view = render(<PostVideoViewer src="video.mp4" onClose={onClose} />);
  const video = view.container.querySelector('video') as HTMLVideoElement;
  return { ...view, onClose, video };
}

function pointer(target: Element, type: string, clientX: number) {
  const event = new Event(type, { bubbles: true });
  Object.assign(event, { clientX, pointerId: 1 });
  fireEvent(target, event);
}

describe('PostVideoViewer', () => {
  it('커스텀 전체화면에 닫기, 시간, 탐색바, 음량 버튼을 표시한다', () => {
    const { container, onClose, video } = renderViewer();
    Object.defineProperty(video, 'duration', { configurable: true, value: 80 });
    fireEvent.loadedMetadata(video);
    video.currentTime = 55;
    fireEvent.timeUpdate(video);

    expect(video).toHaveClass('size-full', 'object-cover');
    expect(video).not.toHaveAttribute('controls');
    expect(video).not.toHaveAttribute('loop');
    expect(video).toHaveProperty('muted', true);
    const time = screen.getByText('0:55 / 1:20');
    expect(time).toHaveClass('font-sans', 'text-b2', 'font-semibold');
    expect(time.className).not.toContain('drop-shadow');
    expect(screen.getByRole('slider', { name: '동영상 재생 위치' })).toHaveAttribute(
      'aria-valuenow',
      '55',
    );
    const progress = container.querySelector('[data-slot="video-progress"]');
    expect(progress?.parentElement).toHaveClass('bg-[#777777]/90');
    expect(progress).toHaveClass('bg-gray-0');
    expect(progress).toHaveStyle({
      width: '68.75%',
    });
    expect(
      screen.getByRole('button', { name: '확대 화면 닫기' }).querySelector('svg'),
    ).toHaveAttribute('width', '24');
    expect(screen.getByRole('button', { name: '소리 켜기' }).querySelector('svg')).toHaveAttribute(
      'width',
      '16',
    );

    fireEvent.click(screen.getByRole('button', { name: '소리 켜기' }));
    expect(video).toHaveProperty('muted', false);
    fireEvent.click(screen.getByRole('button', { name: '확대 화면 닫기' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('화면을 누르면 멈추고 가운데 재생 아이콘을 보여주며 다시 누르면 이어서 재생한다', () => {
    const { container, video } = renderViewer();

    expect(screen.getByRole('button', { name: '일시정지' })).toBeInTheDocument();
    expect(container.querySelector('[data-slot="video-viewer-play-icon"]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '일시정지' }));
    expect(video).toHaveProperty('paused', true);
    expect(container.querySelector('[data-slot="video-viewer-play-icon"]')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '재생' }));
    expect(video).toHaveProperty('paused', false);
    expect(container.querySelector('[data-slot="video-viewer-play-icon"]')).toBeNull();
  });

  it('탐색바를 드래그하는 동안 미리보기를 이동시키고 손을 놓은 시점부터 재생한다', () => {
    const { container, video } = renderViewer();
    Object.defineProperty(video, 'duration', { configurable: true, value: 100 });
    fireEvent.loadedMetadata(video);
    video.currentTime = 10;
    fireEvent.timeUpdate(video);
    const slider = screen.getByRole('slider', { name: '동영상 재생 위치' });
    vi.spyOn(slider, 'getBoundingClientRect').mockReturnValue({ left: 10, width: 200 } as DOMRect);

    pointer(slider, 'pointerdown', 60);
    expect(video).toHaveProperty('paused', true);
    expect(container.querySelectorAll('video')).toHaveLength(2);
    expect(screen.getByText('0:25 / 1:40')).toBeInTheDocument();
    const preview = container.querySelectorAll('video')[1] as HTMLVideoElement;
    expect(preview.parentElement).toHaveClass(
      'w-[60px]',
      'h-[107px]',
      'rounded-lg',
      'border-gray-0',
    );
    Object.defineProperty(preview, 'readyState', { configurable: true, value: 1 });
    fireEvent.loadedMetadata(preview);
    expect(preview.currentTime).toBe(25);

    pointer(slider, 'pointermove', 160);
    expect(video.currentTime).toBe(10);
    expect(preview.currentTime).toBe(75);
    expect(screen.getByText('1:15 / 1:40')).toBeInTheDocument();

    pointer(slider, 'pointerup', 160);
    expect(video.currentTime).toBe(75);
    expect(video).toHaveProperty('paused', false);
    expect(container.querySelectorAll('video')).toHaveLength(1);
  });

  it('확대 전 재생 시점과 음량을 이어받고 닫을 때 인라인 영상에 돌려준다', () => {
    const view = render(<VideoPlayer src="video.mp4" />);
    const inline = view.container.querySelector('video') as HTMLVideoElement;
    inline.currentTime = 12;
    fireEvent.click(screen.getByRole('button', { name: '소리 켜기' }));

    view.rerender(
      <>
        <VideoPlayer src="video.mp4" />
        <PostVideoViewer src="video.mp4" onClose={vi.fn()} />
      </>,
    );
    const full = view.container.querySelectorAll('video')[1] as HTMLVideoElement;
    Object.defineProperty(full, 'duration', { configurable: true, value: 100 });
    fireEvent.loadedMetadata(full);
    expect(inline).toHaveProperty('paused', true);
    expect(full.currentTime).toBe(12);
    expect(full).toHaveProperty('muted', false);

    full.currentTime = 25;
    view.rerender(<VideoPlayer src="video.mp4" />);
    expect(inline.currentTime).toBe(25);
    expect(inline).toHaveProperty('muted', false);
    expect(inline).toHaveProperty('paused', false);
  });
});
