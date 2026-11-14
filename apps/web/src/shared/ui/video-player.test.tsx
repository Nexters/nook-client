import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VideoPlayer } from './video-player';

/**
 * jsdom 은 재생을 흉내내지 않는다 — `play()`/`pause()` 는 구현조차 없어 호출하면 던진다.
 * 그래서 둘을 스텁으로 갈아 끼우고 이벤트를 직접 쏴서, 컴포넌트가 재생 상태를 이벤트로
 * 따라가는지(자체 플래그로 넘겨짚지 않는지)까지 함께 본다.
 */
const VIDEO_URL = 'https://cdn.example.com/posts/1.mp4';

beforeEach(() => {
  vi.useFakeTimers();
  // jsdom 의 `paused` 는 언제나 true 라 토글이 한쪽으로만 간다 — 재생 상태를 실제로
  // 들고 있는 getter 로 갈아 끼워야 "누르면 멈추고 다시 누르면 재생"을 볼 수 있다.
  Object.defineProperty(HTMLMediaElement.prototype, 'paused', {
    configurable: true,
    get(this: HTMLMediaElement & { _paused?: boolean }) {
      return this._paused ?? false;
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

describe('VideoPlayer', () => {
  it('인라인 속성과 muted를 먼저 적용한 뒤 코드에서 자동재생하고 네이티브 컨트롤을 쓰지 않는다', () => {
    const { container } = render(<VideoPlayer src={VIDEO_URL} />);

    const video = container.querySelector('video');
    expect(video).toHaveAttribute('src', VIDEO_URL);
    expect(video).not.toHaveAttribute('autoplay');
    expect(video).toHaveAttribute('playsinline');
    expect(video).toHaveAttribute('webkit-playsinline');
    expect(video).toHaveProperty('muted', true);
    expect(video).not.toHaveAttribute('controls');
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });

  it('unmuted 를 넘기면 소리를 켠다', () => {
    const { container } = render(<VideoPlayer src={VIDEO_URL} unmuted />);

    expect(container.querySelector('video')).toHaveProperty('muted', false);
  });

  it('누르면 일시정지되고 다시 누르면 재생된다', () => {
    render(<VideoPlayer src={VIDEO_URL} />);

    // 재생 중이라 버튼 이름이 "일시정지". 진짜 버튼은 영상 전체를 덮는 하나뿐이다.
    act(() => screen.getByRole('button', { name: '일시정지' }).click());
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();

    act(() => screen.getByRole('button', { name: '재생' }).click());
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });

  it('onExpand 를 넘겼을 때만 확대 버튼이 생긴다', () => {
    const onExpand = vi.fn();
    const { rerender } = render(<VideoPlayer src={VIDEO_URL} />);
    expect(screen.queryByRole('button', { name: '영상 크게 보기' })).not.toBeInTheDocument();

    rerender(<VideoPlayer src={VIDEO_URL} onExpand={onExpand} />);
    act(() => screen.getByRole('button', { name: '영상 크게 보기' }).click());
    expect(onExpand).toHaveBeenCalled();
  });

  /**
   * 아이콘 레이어는 전체 버튼 위에 있다 — 레이어가 탭을 받으면 아이콘이 보이는 동안
   * 재생/일시정지가 먹지 않는다(NOOK-432). 레이어는 언제나 탭을 통과시키고, 확대 버튼만
   * 보일 때 탭을 받아야 한다 — 숨은 뒤에도 눌리면 보이지도 않는 버튼이 엉뚱한 화면을 연다.
   */
  it('아이콘 레이어는 탭을 통과시키고 확대 버튼은 보일 때만 눌린다', () => {
    const { container } = render(<VideoPlayer src={VIDEO_URL} onExpand={vi.fn()} />);
    const overlay = container.querySelector('.z-30');
    const expand = screen.getByRole('button', { name: '영상 크게 보기' });

    expect(overlay?.className).toContain('opacity-100');
    expect(overlay?.className).toContain('pointer-events-none');
    expect(expand.className).toContain('pointer-events-auto');

    act(() => vi.advanceTimersByTime(2000));

    expect(overlay?.className).toContain('opacity-0');
    expect(overlay?.className).toContain('pointer-events-none');
    expect(expand.className).not.toContain('pointer-events-auto');
  });

  it('멈춰 있으면 컨트롤을 숨기지 않는다', () => {
    const { container } = render(<VideoPlayer src={VIDEO_URL} />);

    // 멈춘 뒤에도 시간이 흐르게 둔다 — 재생 버튼까지 사라지면 되돌릴 방법이 없다.
    act(() => screen.getByRole('button', { name: '일시정지' }).click());
    act(() => vi.advanceTimersByTime(5000));

    expect(container.querySelector('.z-30')?.className).toContain('opacity-100');
  });
});
