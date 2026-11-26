import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// 상세가 오기 전 자리(스켈레톤)만 그려도 제스처 판정엔 충분하다.
vi.mock('@/features/map/api/queries', () => ({ usePlaceDetail: () => ({ data: undefined }) }));

// jsdom 엔 PointerEvent 가 없어 좌표가 빠진다 — 좌표를 싣는 MouseEvent 로 채운다.
if (!('PointerEvent' in globalThis)) {
  (globalThis as { PointerEvent?: unknown }).PointerEvent = class extends MouseEvent {};
}

const { FloatingPlaceCards } = await import('./FloatingPlaceCards');

function setup(collapsed: boolean) {
  const onCollapsedChange = vi.fn();
  const onExpandFull = vi.fn();
  render(
    <FloatingPlaceCards
      placeIds={[1]}
      activeIndex={0}
      collapsed={collapsed}
      onActiveIndexChange={vi.fn()}
      onCollapsedChange={onCollapsedChange}
      onExpandFull={onExpandFull}
      onClose={vi.fn()}
      onSelectPlace={vi.fn()}
    />,
  );
  const card = screen.getByRole('region', { name: '장소' });
  /** `durationMs` — 누른 순간부터 뗄 때까지 걸린 시간. 짧은 거리라도 빠르면 튕기기로 본다(NOOK-441). */
  const drag = (dx: number, dy: number, durationMs = 400) => {
    const now = vi.spyOn(performance, 'now').mockReturnValue(1000);
    fireEvent.pointerDown(card, { clientX: 100, clientY: 400, button: 0 });
    now.mockReturnValue(1000 + durationMs);
    // 손은 카드 밖으로 나갈 수 있다 — 이동·떼기는 window 에서 받는다.
    fireEvent.pointerMove(window, { clientX: 100 + dx, clientY: 400 + dy });
    fireEvent.pointerUp(window, { clientX: 100 + dx, clientY: 400 + dy });
    now.mockRestore();
  };
  return { card, drag, onCollapsedChange, onExpandFull };
}

describe('FloatingPlaceCards 높이 제스처(NOOK-383)', () => {
  it('펼친 카드를 끌어올리면 전체 화면, 끌어내리면 접기', () => {
    const { drag, onCollapsedChange, onExpandFull } = setup(false);
    drag(0, -80);
    expect(onExpandFull).toHaveBeenCalledTimes(1);
    drag(0, 80);
    expect(onCollapsedChange).toHaveBeenCalledWith(true);
  });

  it('접힌 카드는 끌어올리거나 누르면 펴진다 — 전체 화면으로 건너뛰지 않는다', () => {
    const { card, drag, onCollapsedChange, onExpandFull } = setup(true);
    drag(0, -80);
    expect(onCollapsedChange).toHaveBeenLastCalledWith(false);
    // 끌기 뒤에 따라오는 click 은 삼킨다 — 새로 누른 탭(pointerdown 부터)만 펼치기로 받는다.
    fireEvent.click(card);
    expect(onCollapsedChange).toHaveBeenCalledTimes(1);
    fireEvent.pointerDown(card, { clientX: 100, clientY: 400, button: 0 });
    fireEvent.pointerUp(window, { clientX: 100, clientY: 400 });
    fireEvent.click(card);
    expect(onCollapsedChange).toHaveBeenCalledTimes(2);
    expect(onExpandFull).not.toHaveBeenCalled();
  });

  it('세로로 정해진 끌기는 손을 뗄 때까지 가로 스크롤을 막는다 — 옆 카드로 넘어가지 않게(NOOK-440)', () => {
    const { card, onExpandFull } = setup(false);
    const touchMove = () => {
      const event = new Event('touchmove', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };
    fireEvent.pointerDown(card, { clientX: 100, clientY: 400, button: 0 });
    fireEvent.pointerMove(window, { clientX: 102, clientY: 380 });
    expect(touchMove()).toBe(true);
    // 위로 끄는 중 손가락이 옆으로 흘러도 세로 그대로다.
    fireEvent.pointerMove(window, { clientX: 160, clientY: 340 });
    expect(touchMove()).toBe(true);
    fireEvent.pointerUp(window, { clientX: 160, clientY: 320 });
    expect(onExpandFull).toHaveBeenCalledTimes(1);
    expect(touchMove()).toBe(false);
  });

  it('가로로 정해진 끌기는 브라우저 스크롤에 맡긴다', () => {
    const { card } = setup(false);
    fireEvent.pointerDown(card, { clientX: 100, clientY: 400, button: 0 });
    fireEvent.pointerMove(window, { clientX: 70, clientY: 396 });
    const event = new Event('touchmove', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    fireEvent.pointerUp(window, { clientX: 40, clientY: 396 });
  });

  it('문턱보다 짧아도 빠르게 튕기면 넘기고, 천천히 움직이면 그대로 둔다(NOOK-441)', () => {
    const { drag, onCollapsedChange } = setup(false);
    drag(0, 20, 400);
    expect(onCollapsedChange).not.toHaveBeenCalled();
    drag(0, 20, 50);
    expect(onCollapsedChange).toHaveBeenCalledWith(true);
  });

  it('짧은 흔들림이나 가로 넘기기는 높이를 바꾸지 않는다', () => {
    const { drag, onCollapsedChange, onExpandFull } = setup(false);
    drag(0, -20);
    drag(-120, -60);
    expect(onCollapsedChange).not.toHaveBeenCalled();
    expect(onExpandFull).not.toHaveBeenCalled();
  });
});
