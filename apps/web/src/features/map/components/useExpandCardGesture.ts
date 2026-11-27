import type { MouseEvent, PointerEvent } from 'react';
import { useRef } from 'react';

/** Vertical drags expand the card; horizontal drags stay with its place/photo carousel. */
export function useExpandCardGesture(onExpand?: () => void, onCollapse?: () => void) {
  const gesture = useRef<{ x: number; y: number; time: number; vertical: boolean } | null>(null);
  const suppressClick = useRef(false);
  const reset = (element: HTMLElement) => {
    element.style.transform = '';
    gesture.current = null;
  };
  return {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if ((!onExpand && !onCollapse) || event.button !== 0) return;
      const target = event.target as HTMLElement;
      if (
        target.closest('input, textarea, a') ||
        (target.closest('button') &&
          !target.closest('[data-expand-handle], [data-slot="place-photos"]'))
      )
        return;
      suppressClick.current = false;
      gesture.current = {
        x: event.clientX,
        y: event.clientY,
        time: event.timeStamp,
        vertical: false,
      };
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      const start = gesture.current;
      if (!start) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (!start.vertical) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 10) return;
        if (Math.abs(dx) >= Math.abs(dy)) {
          gesture.current = null;
          return;
        }
        start.vertical = true;
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }
      event.preventDefault();
      suppressClick.current = true;
      event.currentTarget.style.transform = `translate3d(0, ${dy}px, 0)`;
    },
    onPointerUp(event: PointerEvent<HTMLElement>) {
      const start = gesture.current;
      const distance = start ? start.y - event.clientY : 0;
      const velocity = start ? distance / Math.max(1, event.timeStamp - start.time) : 0;
      const settle =
        start?.vertical &&
        (Math.abs(distance) >= 48 || (Math.abs(distance) >= 12 && Math.abs(velocity) > 0.5));
      reset(event.currentTarget);
      if (settle) {
        if (distance > 0) onExpand?.();
        else onCollapse?.();
      }
    },
    onPointerCancel(event: PointerEvent<HTMLElement>) {
      reset(event.currentTarget);
    },
    onClickCapture(event: MouseEvent<HTMLElement>) {
      if (!suppressClick.current) return;
      event.preventDefault();
      event.stopPropagation();
      suppressClick.current = false;
    },
  };
}
