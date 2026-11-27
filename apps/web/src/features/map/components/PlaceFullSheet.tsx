import { animate, useReducedMotion } from 'framer-motion';
import { type CSSProperties, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PlaceDetail } from '@/features/map/components/PlaceDetail';
import type { PlaceDetail as PlaceDetailModel } from '@/features/map/types';
import type { Coordinates } from '@/shared/lib/geolocation';
import {
  type GestureSample,
  releaseVelocity,
  sampleGesture,
  shouldAdvanceSheet,
} from './sheet-gesture';

/** 끌어올린 카드가 있던 자리(뷰포트 기준). 풀업은 여기서 커지고, 닫힐 땐 `rest` 로 줄어든다. */
export interface CardOrigin {
  /** 손을 놓은 순간의 카드 — 늘어난 높이 그대로다. 여기서부터 화면을 채운다. */
  from: DOMRect;
  /** 카드가 쉬는 높이의 자리 — 닫힐 때 여기까지 줄어들고 나서 카드와 바통을 바꾼다. */
  rest: DOMRect;
}

/** 이만큼 넘게 끌어내리면 닫는다. 덜 끌면 다시 꽉 찬다. */
const CLOSE_THRESHOLD_PX = 120;
/** 커질 땐 플로팅 카드·지도 시트(vaul)와 같은 곡선·시간. */
const DURATION_MS = 500;
const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';
/**
 * 줄어들 땐 짧고 꼬리 없이 — vaul 곡선은 거의 다 와서 오래 끌어, 카드 자리에 닿고도 한참 뒤에야
 * 카드와 바뀌는 게 "늦게 자리를 찾는" 느낌이었다(QA).
 */
const CLOSE_DURATION_MS = 260;
const CLOSE_EASE = 'cubic-bezier(0.2, 0, 0, 1)';
const CARD_RADIUS_PX = 14;

type Frame = { top: number; left: number; right: number; bottom: number; radius: number };
const FULL: Frame = { top: 0, left: 0, right: 0, bottom: 0, radius: 0 };

/** 뷰포트 기준 카드 자리를 이 패널이 앉은 컨테이너 기준 inset 으로 바꾼다. */
function frameOf(rect: DOMRect, container: DOMRect): Frame {
  return {
    top: rect.top - container.top,
    left: rect.left - container.left,
    right: container.right - rect.right,
    bottom: container.bottom - rect.bottom,
    radius: CARD_RADIUS_PX,
  };
}

/**
 * 검색 결과 지도의 풀업 — 플로팅 카드가 그대로 커져 화면을 채운 전체 상세(Figma `풀업`, NOOK-383).
 *
 * 따로 올라오는 시트가 아니라 카드가 늘어난 모습이어야 한다 — 손을 놓은 카드 자리(`origin.from`)에서
 * 시작해 화면 끝까지 커지고, 맨 위에서 끌어내리면 손을 따라 내려오다 놓으면 카드 자리(`origin.rest`)로
 * 줄어든 뒤 닫힌다(`onClose` = 뒤로가기). 그동안 진짜 카드는 바깥이 가려 둔다.
 *
 * 열림의 주인은 바깥의 히스토리 엔트리다 — 뒤로가기·iOS 스와이프로 엔트리가 빠지면 바깥이 바로 내린다
 * (스와이프는 시스템이 직전 화면 스냅샷을 보여주므로 따로 줄어들 필요가 없다).
 */
export function PlaceFullSheet({
  place,
  shareToken,
  origin,
  userCoords,
  onClose,
  onSelectPlace,
}: {
  place: PlaceDetailModel;
  shareToken?: string | null;
  /** 없으면(앞으로 가기 등 카드를 거치지 않은 진입) 모션 없이 꽉 찬 채로 열리고 닫힌다. */
  origin: CardOrigin | null;
  userCoords?: Coordinates | null;
  onClose: () => void;
  onSelectPlace: (placeId: number) => void;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // 지금 앉아 있을 자리. 처음엔 카드 자리에서 시작해 다음 프레임에 화면 전체로 옮겨 가며 전환된다.
  const [frame, setFrame] = useState<Frame>(FULL);
  // 맨 위에서 끌어내린 거리 — 끄는 동안엔 전환 없이 손을 바로 따라간다.
  const dragY = useRef(0);
  const settling = useRef<{ stop: () => void } | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedMotion = useReducedMotion();
  const interruptedClose = useRef(false);
  const resetDrag = (velocity = 0) => {
    if (interruptedClose.current) {
      interruptedClose.current = false;
      setInstant(false);
      setFrame(FULL);
    }
    settling.current?.stop();
    const panel = panelRef.current;
    if (!panel) return;
    panel.style.transition = 'none';
    settling.current = animate(dragY.current, 0, {
      type: 'spring',
      duration: reducedMotion ? 0.12 : 0.4,
      bounce: 0,
      velocity: velocity * 1000,
      onUpdate: (y) => {
        dragY.current = y;
        panel.style.transform = `translate3d(0, ${y}px, 0)`;
      },
      onComplete: () => {
        settling.current = null;
        panel.style.transition = '';
        panel.style.borderRadius = '';
      },
    });
  };
  const resetDragRef = useRef(resetDrag);
  resetDragRef.current = resetDrag;
  useEffect(
    () => () => {
      settling.current?.stop();
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );
  const closingRef = useRef(false);
  const [closing, setClosing] = useState(false);
  // 카드 자리로 옮겨 앉는 첫 순간엔 전환을 끈다 — 켜 두면 처음 붙은 꽉 찬 모양에서 카드 자리로
  // 되돌아가는 전환이 먼저 시작돼 커지는 모습이 사라진다.
  const [instant, setInstant] = useState(Boolean(origin));

  useLayoutEffect(() => {
    if (settling.current && panelRef.current) panelRef.current.style.transition = 'none';
  });

  const containerRect = () => panelRef.current?.parentElement?.getBoundingClientRect() ?? null;

  // biome-ignore lint/correctness/useExhaustiveDependencies: 열리는 순간 한 번만 카드 자리에서 출발한다
  useLayoutEffect(() => {
    const container = containerRect();
    if (!origin || !container) return;
    setFrame(frameOf(origin.from, container));
    // 카드 자리를 한 번 그린 다음 프레임에 화면 전체로 — 그래야 그 사이가 전환된다.
    const raf = requestAnimationFrame(() => {
      // 카드 자리를 브라우저가 한 번은 계산하게 만든다 — 건너뛰면 전환 없이 바로 꽉 찬다.
      panelRef.current?.getBoundingClientRect();
      setInstant(false);
      setFrame(FULL);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  /** 카드 자리로 줄어든 뒤 닫는다. 카드 자리를 모르면 바로 닫는다. */
  const close = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    settling.current?.stop();
    const container = containerRect();
    if (!origin || !container) {
      onClose();
      return;
    }
    setInstant(false);
    setClosing(true);
    setFrame(frameOf(origin.rest, container));
    closeTimer.current = setTimeout(onClose, reducedMotion ? 120 : CLOSE_DURATION_MS);
  };
  const closeRef = useRef(close);
  closeRef.current = close;

  // 맨 위에서 끌어내리기. 터치는 스크롤과 다퉈야 해서 touchmove 를 직접 막고(passive: false),
  // 마우스는 포인터로 받는다 — 터치까지 포인터로 받으면 브라우저가 스크롤로 가져가며 끊는다.
  useEffect(() => {
    const scroller = scrollRef.current;
    const panel = panelRef.current;
    if (!scroller || !panel) return;
    let startY = 0;
    let startX = 0;
    let lastY = 0;
    let started = false;
    let dragging = false;
    let startOffset = 0;
    let distance = 0;
    let horizontal = false;
    let samples: GestureSample[] = [];
    let mouseCleanup: (() => void) | undefined;

    const begin = (x: number, y: number, target: EventTarget | null) => {
      if (
        target instanceof Element &&
        target.closest('button, input, textarea, a, [data-vaul-no-drag]')
      )
        return;
      settling.current?.stop();
      if (closeTimer.current) {
        clearTimeout(closeTimer.current);
        closeTimer.current = null;
        closingRef.current = false;
        interruptedClose.current = true;
        const panelBox = panel.getBoundingClientRect();
        const container = panel.parentElement?.getBoundingClientRect();
        if (container) {
          setInstant(true);
          setClosing(false);
          setFrame(frameOf(panelBox, container));
          panel.style.transform = '';
          dragY.current = 0;
        }
      }
      startY = lastY = y;
      startX = x;
      startOffset = dragY.current;
      distance = 0;
      started = true;
      dragging = horizontal = false;
      samples = [{ position: y, time: performance.now() }];
    };
    const move = (x: number, y: number) => {
      if (!started || horizontal) return false;
      const dy = y - startY;
      const dx = x - startX;
      sampleGesture(samples, y, performance.now());
      if (!dragging) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) return false;
        if (Math.abs(dx) > Math.abs(dy)) {
          horizontal = true;
          return false;
        }
        if (scroller.scrollTop > 0 || y <= lastY) {
          startY = lastY = y;
          return false;
        }
        dragging = true;
        // Start from where scrolling handed off, rather than the original touch-down position.
        startY = lastY;
        panel.style.transition = 'none';
      }
      distance = Math.max(0, startOffset + y - startY);
      dragY.current = distance;
      panel.style.transform = `translate3d(0, ${distance}px, 0)`;
      panel.style.borderRadius = `${CARD_RADIUS_PX}px`;
      lastY = y;
      return true;
    };
    const end = (cancelled = false) => {
      if (!started) return;
      started = false;
      if (!dragging) {
        if (interruptedClose.current || dragY.current !== 0) resetDragRef.current();
        return;
      }
      dragging = false;
      const velocity = releaseVelocity(samples, performance.now());
      if (!cancelled && shouldAdvanceSheet(distance, velocity, CLOSE_THRESHOLD_PX)) {
        // Restore the morph's transition before it heads back to its source card.
        panel.style.transition = '';
        closeRef.current();
      } else resetDragRef.current(cancelled ? 0 : velocity);
    };
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t && e.touches.length === 1) begin(t.clientX, t.clientY, e.target);
      else end(true);
    };
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (e.touches.length !== 1) {
        end(true);
        return;
      }
      if (t && move(t.clientX, t.clientY) && e.cancelable) e.preventDefault();
    };
    const onTouchEnd = () => end();
    const onCancel = () => end(true);
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      mouseCleanup?.();
      begin(e.clientX, e.clientY, e.target);
      const onMove = (m: PointerEvent) => move(m.clientX, m.clientY);
      const finish = (cancelled: boolean) => {
        mouseCleanup?.();
        end(cancelled);
      };
      const onUp = () => finish(false);
      const onPointerCancel = () => finish(true);
      mouseCleanup = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onPointerCancel);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onPointerCancel);
    };
    panel.addEventListener('touchstart', onTouchStart, { passive: true });
    panel.addEventListener('touchmove', onTouchMove, { passive: false });
    panel.addEventListener('touchend', onTouchEnd);
    panel.addEventListener('touchcancel', onCancel);
    panel.addEventListener('pointerdown', onPointerDown);
    return () => {
      mouseCleanup?.();
      panel.removeEventListener('touchstart', onTouchStart);
      panel.removeEventListener('touchmove', onTouchMove);
      panel.removeEventListener('touchend', onTouchEnd);
      panel.removeEventListener('touchcancel', onCancel);
      panel.removeEventListener('pointerdown', onPointerDown);
    };
  }, []);

  useLayoutEffect(() => {
    if (closing && panelRef.current) {
      panelRef.current.style.transform = 'translate3d(0, 0, 0)';
      dragY.current = 0;
    }
  }, [closing]);

  const style: CSSProperties = {
    top: frame.top,
    left: frame.left,
    right: frame.right,
    bottom: frame.bottom,
    borderRadius: frame.radius,
    transition: !instant
      ? ['top', 'left', 'right', 'bottom', 'border-radius', 'transform']
          .map((prop) =>
            closing
              ? `${prop} ${reducedMotion ? 120 : CLOSE_DURATION_MS}ms ${CLOSE_EASE}`
              : `${prop} ${reducedMotion ? 120 : DURATION_MS}ms ${EASE}`,
          )
          .join(', ')
      : 'none',
  };

  return (
    <section
      ref={panelRef}
      aria-label={place.name}
      className="absolute z-20 flex flex-col overflow-hidden bg-gray-0"
      style={style}
    >
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 1.25rem)',
        }}
      >
        <div aria-hidden="true" className="flex justify-center pt-3 pb-5">
          <span className="h-1 w-20 rounded-full bg-gray-20" />
        </div>
        <PlaceDetail
          key={place.id}
          place={place}
          shareToken={shareToken}
          expanded
          userCoords={userCoords}
          onClose={close}
          onSelectPlace={onSelectPlace}
        />
      </div>
    </section>
  );
}
