import { fireEvent, render, screen } from '@testing-library/react';
import { useRef, useState } from 'react';
import { expect, it, vi } from 'vitest';
import { usePointerDragScroll } from './usePointerDragScroll';

it('lets a mouse drag the carousel directly and selects the next item on release', () => {
  vi.stubGlobal('PointerEvent', MouseEvent);
  const width = vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(351);
  function Harness() {
    const ref = useRef<HTMLDivElement>(null);
    const [index, setIndex] = useState(0);
    const drag = usePointerDragScroll(ref, { count: 3, gap: 4, onIndexChange: setIndex });
    return (
      <>
        <output>{index}</output>
        <div ref={ref} {...drag}>
          <div>첫 카드</div>
          <div>둘째 카드</div>
          <div>셋째 카드</div>
        </div>
      </>
    );
  }
  try {
    render(<Harness />);
    const card = screen.getByText('첫 카드');
    const scroller = card.parentElement;
    if (!scroller) throw new Error('Missing scroller');
    fireEvent.pointerDown(card, { button: 0, clientX: 300, clientY: 100 });
    fireEvent.pointerMove(scroller, { clientX: 80, clientY: 102 });
    expect(scroller.scrollLeft).toBe(220);
    fireEvent.pointerUp(scroller, { clientX: 80, clientY: 102 });
    expect(screen.getByRole('status')).toHaveTextContent('1');
  } finally {
    width.mockRestore();
    vi.unstubAllGlobals();
  }
});
