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
  const drag = (dx: number, dy: number) => {
    fireEvent.pointerDown(card, { clientX: 100, clientY: 400, button: 0 });
    // 손은 카드 밖으로 나갈 수 있다 — 이동·떼기는 window 에서 받는다.
    fireEvent.pointerMove(window, { clientX: 100 + dx, clientY: 400 + dy });
    fireEvent.pointerUp(window, { clientX: 100 + dx, clientY: 400 + dy });
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

  it('짧은 흔들림이나 가로 넘기기는 높이를 바꾸지 않는다', () => {
    const { drag, onCollapsedChange, onExpandFull } = setup(false);
    drag(0, -20);
    drag(-120, -60);
    expect(onCollapsedChange).not.toHaveBeenCalled();
    expect(onExpandFull).not.toHaveBeenCalled();
  });
});
