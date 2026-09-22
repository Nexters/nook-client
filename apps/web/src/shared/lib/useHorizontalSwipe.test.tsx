import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useHorizontalSwipe } from '@/shared/lib/useHorizontalSwipe';

function Harness({
  onSwipeLeft,
  onSwipeRight,
  enabled,
}: {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  enabled?: boolean;
}) {
  const handlers = useHorizontalSwipe({ onSwipeLeft, onSwipeRight, enabled });
  return (
    <div data-testid="area" {...handlers}>
      <div data-testid="carousel" style={{ overflowX: 'auto' }}>
        <div data-testid="slide" />
      </div>
      <div data-testid="plain" />
    </div>
  );
}

const at = (clientX: number, clientY: number) => ({ clientX, clientY });
const START = { x: 200, y: 300 };

/** jsdom 은 레이아웃이 없어 scrollWidth 가 늘 0 이다 — 가로 스크롤러를 직접 흉내낸다. */
function stubWidths(el: HTMLElement, scrollWidth: number, clientWidth: number) {
  Object.defineProperty(el, 'scrollWidth', { configurable: true, value: scrollWidth });
  Object.defineProperty(el, 'clientWidth', { configurable: true, value: clientWidth });
}

function setup(props: Partial<Parameters<typeof Harness>[0]> = {}) {
  const onSwipeLeft = vi.fn();
  const onSwipeRight = vi.fn();
  render(<Harness onSwipeLeft={onSwipeLeft} onSwipeRight={onSwipeRight} {...props} />);
  return { onSwipeLeft, onSwipeRight };
}

/** 한 손가락을 `from` 에 대고 (dx, dy) 만큼 끌었다 뗀다. 축은 첫 움직임에서 정해진다. */
function swipe(dx: number, dy: number, { from = START, target = 'plain' } = {}) {
  const area = screen.getByTestId('area');
  const origin = screen.getByTestId(target);
  fireEvent.touchStart(origin, { touches: [at(from.x, from.y)] });
  fireEvent.touchMove(area, { touches: [at(from.x + dx / 2, from.y + dy / 2)] });
  fireEvent.touchMove(area, { touches: [at(from.x + dx, from.y + dy)] });
  fireEvent.touchEnd(area, { changedTouches: [at(from.x + dx, from.y + dy)] });
}

describe('useHorizontalSwipe', () => {
  it('충분히 왼쪽/오른쪽으로 쓸면 그 방향으로 알린다', () => {
    const { onSwipeLeft, onSwipeRight } = setup();

    swipe(-120, 0);
    expect(onSwipeLeft).toHaveBeenCalledTimes(1);

    swipe(120, 0);
    expect(onSwipeRight).toHaveBeenCalledTimes(1);
  });

  it('조금만 움직였으면 넘기지 않는다', () => {
    const { onSwipeLeft } = setup();

    swipe(-30, 0);
    expect(onSwipeLeft).not.toHaveBeenCalled();
  });

  it('세로로 정해진 제스처는 목록 스크롤 몫이라 넘기지 않는다', () => {
    const { onSwipeLeft } = setup();

    // 가로로도 꽤 움직였지만 세로가 더 크다 — 축은 첫 움직임에서 세로로 굳는다.
    swipe(-80, 200);
    expect(onSwipeLeft).not.toHaveBeenCalled();
  });

  it('좌측 엣지에서 시작한 손가락은 셸의 뒤로가기 제스처에 양보한다', () => {
    const { onSwipeRight } = setup();

    swipe(120, 0, { from: { x: 8, y: 300 } });
    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  it('이미지 캐러셀처럼 가로로 스크롤되는 영역에서 시작하면 그쪽에 양보한다', () => {
    const { onSwipeLeft } = setup();
    stubWidths(screen.getByTestId('carousel'), 900, 300);

    swipe(-120, 0, { target: 'slide' });
    expect(onSwipeLeft).not.toHaveBeenCalled();
  });

  it('enabled 가 false 면 아무것도 듣지 않는다', () => {
    const { onSwipeLeft } = setup({ enabled: false });

    swipe(-120, 0);
    expect(onSwipeLeft).not.toHaveBeenCalled();
  });
});
