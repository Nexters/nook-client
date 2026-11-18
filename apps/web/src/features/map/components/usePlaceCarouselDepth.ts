import { type RefObject, useLayoutEffect } from 'react';

/** Native scroll owns momentum/snap; depth is derived from that same scroll position. */
export function usePlaceCarouselDepth(
  ref: RefObject<HTMLElement | null>,
  count: number,
  gap: number,
) {
  useLayoutEffect(() => {
    const scroller = ref.current;
    if (!scroller) return;
    const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const update = () => {
      const cards = Array.from(scroller.children).filter(
        (child): child is HTMLElement => child instanceof HTMLElement,
      );
      const step = (cards[0]?.offsetWidth ?? 0) + gap;
      if (step <= gap) return;
      const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
      const position = scroller.scrollLeft;
      cards.forEach((card, index) => {
        // Last card aligns to the right gutter, rather than a full extra scroll step.
        const anchor = maxScroll > 0 ? Math.min(index * step, maxScroll) : index * step;
        const progress = Math.max(-1, Math.min(1, (anchor - position) / step));
        const surface = card.querySelector<HTMLElement>('[data-place-card-surface]');
        if (surface) {
          // Anchor depth at the edge visible in the gutter. Center-origin shrink/rotation
          // moved that edge inward far enough to erase the narrow neighboring-card peek.
          surface.style.transformOrigin =
            progress > 0 ? 'left bottom' : progress < 0 ? 'right bottom' : 'center bottom';
          surface.style.transform =
            preference?.matches || count < 2
              ? ''
              : `perspective(900px) translateZ(${-24 * Math.abs(progress)}px) rotateY(${-14 * progress}deg) scale(${1 - 0.045 * Math.abs(progress)})`;
        }
        // Keep the existing one-sided peek, without a React render on every scroll frame.
        const hidden = index < Math.floor(position / step + 0.01);
        card.style.visibility = hidden ? 'hidden' : '';
        if (hidden) card.setAttribute('aria-hidden', 'true');
        else card.removeAttribute('aria-hidden');
      });
    };
    update();
    scroller.addEventListener('scroll', update, { passive: true });
    preference?.addEventListener('change', update);
    const observer = new ResizeObserver(update);
    observer.observe(scroller);
    return () => {
      scroller.removeEventListener('scroll', update);
      preference?.removeEventListener('change', update);
      observer.disconnect();
    };
  }, [ref, count, gap]);
}
