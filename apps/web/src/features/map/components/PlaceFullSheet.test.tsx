import { fireEvent, render, screen } from '@testing-library/react';
import { animate } from 'framer-motion';
import { describe, expect, it, vi } from 'vitest';
import type { PlaceDetail } from '../types';
import { PlaceFullSheet } from './PlaceFullSheet';

vi.mock('framer-motion', () => ({
  useReducedMotion: () => false,
  animate: vi.fn(() => ({ stop: vi.fn() })),
}));

vi.mock('./PlaceDetail', () => ({ PlaceDetail: () => <div>장소 본문</div> }));
function setup() {
  const onClose = vi.fn();
  render(
    <PlaceFullSheet
      place={{ id: 1, name: '테스트 장소' } as PlaceDetail}
      origin={null}
      onClose={onClose}
      onSelectPlace={vi.fn()}
    />,
  );
  const panel = screen.getByRole('region', { name: '테스트 장소' });
  const scroller = panel.firstElementChild as HTMLElement;
  const touch = (type: string, y: number, x = 100) =>
    fireEvent(
      panel,
      new TouchEvent(type, {
        bubbles: true,
        cancelable: true,
        touches:
          type === 'touchend' || type === 'touchcancel'
            ? []
            : [{ clientX: x, clientY: y } as Touch],
      }),
    );
  return { panel, scroller, touch, onClose };
}
describe('full sheet direct manipulation', () => {
  it('hands off in the same touch after scrolling reaches the top without jumping', () => {
    const { panel, scroller, touch, onClose } = setup();
    scroller.scrollTop = 100;
    touch('touchstart', 200);
    touch('touchmove', 240);
    expect(panel.style.transform).toBe('');
    scroller.scrollTop = 0;
    touch('touchmove', 270);
    expect(panel.style.transform).toBe('translate3d(0, 30px, 0)');
    touch('touchmove', 410);
    touch('touchend', 410);
    expect(onClose).toHaveBeenCalledOnce();
  });
  it('never closes on cancellation even beyond the dismiss threshold', () => {
    const { touch, onClose } = setup();
    touch('touchstart', 200);
    touch('touchmove', 380);
    touch('touchcancel', 380);
    expect(onClose).not.toHaveBeenCalled();
  });
  it('lets horizontal photo swipes stay horizontal', () => {
    const { panel, touch, onClose } = setup();
    touch('touchstart', 200);
    touch('touchmove', 230, 250);
    touch('touchend', 230, 250);
    expect(panel.style.transform).toBe('');
    expect(onClose).not.toHaveBeenCalled();
  });
});

it('resumes a return spring when caught and released without another drag', () => {
  vi.mocked(animate).mockClear();
  const { touch } = setup();
  touch('touchstart', 200);
  touch('touchmove', 230);
  touch('touchcancel', 230);
  expect(animate).toHaveBeenCalledTimes(1);
  touch('touchstart', 230);
  touch('touchend', 230);
  expect(animate).toHaveBeenCalledTimes(2);
});
