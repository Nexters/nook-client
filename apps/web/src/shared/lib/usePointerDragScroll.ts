import type { DragEvent, MouseEvent, PointerEvent, RefObject } from 'react';
import { useRef } from 'react';

/** Mouse/pen equivalent of native touch scrolling; nested carousels own their own gestures. */
export function usePointerDragScroll(
  ref: RefObject<HTMLElement | null>,
  {
    count,
    gap,
    onIndexChange,
  }: { count: number; gap: number; onIndexChange?: (index: number) => void },
) {
  const start = useRef<{
    x: number;
    y: number;
    left: number;
    time: number;
    dragging: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  const previousSnap = useRef('');
  const restore = () => {
    if (ref.current) ref.current.style.scrollSnapType = previousSnap.current;
    start.current = null;
  };
  return {
    'data-drag-scroll': '',
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (count < 2 || event.pointerType === 'touch' || event.button !== 0) return;
      const target = event.target as HTMLElement;
      // 사진이 한 장이어도 그 영역의 가로 드래그를 바깥 장소 넘기기로 넘기지 않는다.
      if (
        target.closest('[data-slot="place-photos"]') &&
        !event.currentTarget.closest('[data-slot="place-photos"]')
      )
        return;
      if (
        target.closest('[data-drag-scroll]') !== event.currentTarget ||
        target.closest('input,textarea,a')
      )
        return;
      if (target.closest('button') && !target.closest('[data-slot="place-photos"]')) return;
      suppressClick.current = false;
      previousSnap.current = event.currentTarget.style.scrollSnapType;
      start.current = {
        x: event.clientX,
        y: event.clientY,
        left: event.currentTarget.scrollLeft,
        time: event.timeStamp,
        dragging: false,
      };
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      const origin = start.current;
      if (!origin) return;
      const dx = event.clientX - origin.x;
      const dy = event.clientY - origin.y;
      if (!origin.dragging) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) return;
        if (Math.abs(dy) > Math.abs(dx)) {
          restore();
          return;
        }
        origin.dragging = true;
        event.currentTarget.setPointerCapture?.(event.pointerId);
        event.currentTarget.style.scrollSnapType = 'none';
      }
      event.preventDefault();
      suppressClick.current = true;
      event.currentTarget.scrollLeft = origin.left - dx;
    },
    onPointerUp(event: PointerEvent<HTMLElement>) {
      const origin = start.current;
      if (!origin) return;
      if (!origin.dragging) {
        restore();
        return;
      }
      const first = event.currentTarget.firstElementChild;
      const step = first instanceof HTMLElement ? first.offsetWidth + gap : 0;
      const dx = origin.x - event.clientX;
      const velocity = dx / Math.max(1, event.timeStamp - origin.time);
      const initial = step > 0 ? Math.round(origin.left / step) : 0;
      const index = Math.min(
        count - 1,
        Math.max(
          0,
          step > 0
            ? Math.abs(dx) > step * 0.2 || Math.abs(velocity) > 0.5
              ? initial + Math.sign(dx)
              : initial
            : 0,
        ),
      );
      restore();
      if (step > 0)
        event.currentTarget.scrollTo({
          left: index * step,
          behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
            ? 'instant'
            : 'smooth',
        });
      onIndexChange?.(index);
    },
    onPointerCancel: restore,
    onDragStart(event: DragEvent<HTMLElement>) {
      event.preventDefault();
    },
    onClickCapture(event: MouseEvent<HTMLElement>) {
      if (!suppressClick.current) return;
      event.preventDefault();
      event.stopPropagation();
      suppressClick.current = false;
    },
  };
}
