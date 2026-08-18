import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useSwipeDownToDismiss } from '@/shared/lib/useSwipeDownToDismiss';

function Harness({ onDismiss }: { onDismiss: () => void }) {
  const swipe = useSwipeDownToDismiss(onDismiss);
  return (
    <div data-testid="layer" {...swipe.handlers}>
      <div
        data-testid="content"
        data-offset={swipe.offset}
        data-backdrop={swipe.backdropOpacity.toFixed(3)}
        data-returning={String(swipe.returning)}
      />
    </div>
  );
}

const at = (clientX: number, clientY: number) => ({ clientX, clientY });
const START = { x: 100, y: 300 };

const layer = () => screen.getByTestId('layer');
const state = () => {
  const el = screen.getByTestId('content');
  return {
    offset: Number(el.dataset.offset),
    backdrop: Number(el.dataset.backdrop),
    returning: el.dataset.returning === 'true',
  };
};

/** 손가락 하나를 대고 중간 지점들을 거쳐 (dx, dy) 까지 끈다. 떼지는 않는다. */
function dragTo(dx: number, dy: number) {
  fireEvent.touchStart(layer(), { touches: [at(START.x, START.y)] });
  // 축은 첫 움직임에서 정해지므로 방향을 유지한 중간 지점을 하나 거친다.
  fireEvent.touchMove(layer(), { touches: [at(START.x + dx / 2, START.y + dy / 2)] });
  fireEvent.touchMove(layer(), { touches: [at(START.x + dx, START.y + dy)] });
}

function release(dx: number, dy: number) {
  fireEvent.touchEnd(layer(), { changedTouches: [at(START.x + dx, START.y + dy)] });
}

describe('useSwipeDownToDismiss', () => {
  it('끄는 동안 내용이 손가락을 따라오고 배경이 옅어진다', () => {
    render(<Harness onDismiss={vi.fn()} />);

    dragTo(0, 160);

    expect(state().offset).toBe(160);
    expect(state().backdrop).toBeLessThan(1);
    // 따라오는 동안에는 transition 을 걸지 않는다 — 손가락과 어긋나면 안 된다.
    expect(state().returning).toBe(false);
  });

  it('충분히 끌고 놓으면 닫는다', () => {
    const onDismiss = vi.fn();
    render(<Harness onDismiss={onDismiss} />);

    dragTo(0, 160);
    release(0, 160);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('임계값에 못 미치면 닫지 않고 제자리로 돌아간다', () => {
    const onDismiss = vi.fn();
    render(<Harness onDismiss={onDismiss} />);

    dragTo(0, 60);
    expect(state().offset).toBe(60);

    release(0, 60);

    expect(onDismiss).not.toHaveBeenCalled();
    expect(state().offset).toBe(0);
    expect(state().backdrop).toBe(1);
    expect(state().returning).toBe(true);
  });

  it('위로 끌면 따라오지도 닫히지도 않는다', () => {
    const onDismiss = vi.fn();
    render(<Harness onDismiss={onDismiss} />);

    dragTo(0, -160);
    release(0, -160);

    expect(state().offset).toBe(0);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  // 사진을 옆으로 넘기는 동작 — 캐러셀이 계속 제 몫을 가져야 한다.
  it('가로로 시작하면 도중에 내려가도 따라오지 않는다', () => {
    const onDismiss = vi.fn();
    render(<Harness onDismiss={onDismiss} />);

    fireEvent.touchStart(layer(), { touches: [at(START.x, START.y)] });
    fireEvent.touchMove(layer(), { touches: [at(START.x - 60, START.y + 4)] });
    fireEvent.touchMove(layer(), { touches: [at(START.x - 70, START.y + 200)] });
    release(-70, 200);

    expect(state().offset).toBe(0);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('손가락이 둘 이상이면 보지 않는다', () => {
    const onDismiss = vi.fn();
    render(<Harness onDismiss={onDismiss} />);

    fireEvent.touchStart(layer(), { touches: [at(100, 300), at(200, 300)] });
    fireEvent.touchMove(layer(), { touches: [at(100, 460), at(200, 460)] });
    release(0, 160);

    expect(state().offset).toBe(0);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('시스템이 터치를 가져가면 제자리로 돌아간다', () => {
    const onDismiss = vi.fn();
    render(<Harness onDismiss={onDismiss} />);

    dragTo(0, 160);
    fireEvent.touchCancel(layer());

    expect(state().offset).toBe(0);
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
