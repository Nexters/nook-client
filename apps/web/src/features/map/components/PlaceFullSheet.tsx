import { type CSSProperties, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PlaceDetail } from '@/features/map/components/PlaceDetail';
import type { PlaceDetail as PlaceDetailModel } from '@/features/map/types';
import type { Coordinates } from '@/shared/lib/geolocation';

/** 끌어올린 카드가 있던 자리(뷰포트 기준). 풀업은 여기서 커지고, 닫힐 땐 `rest` 로 줄어든다. */
export interface CardOrigin {
  /** 손을 놓은 순간의 카드 — 늘어난 높이 그대로다. 여기서부터 화면을 채운다. */
  from: DOMRect;
  /** 카드가 쉬는 높이의 자리 — 닫힐 때 여기까지 줄어들고 나서 카드와 바통을 바꾼다. */
  rest: DOMRect;
}

/** 이만큼 넘게 끌어내리면 닫는다. 덜 끌면 다시 꽉 찬다. */
const CLOSE_THRESHOLD_PX = 120;
/** 플로팅 카드·지도 시트(vaul)와 같은 곡선·시간. */
const DURATION_MS = 500;
const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';
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
  origin,
  userCoords,
  onClose,
  onSelectPlace,
}: {
  place: PlaceDetailModel;
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
  const [dragY, setDragY] = useState<number | null>(null);
  const closingRef = useRef(false);
  // 카드 자리로 옮겨 앉는 첫 순간엔 전환을 끈다 — 켜 두면 처음 붙은 꽉 찬 모양에서 카드 자리로
  // 되돌아가는 전환이 먼저 시작돼 커지는 모습이 사라진다.
  const [instant, setInstant] = useState(Boolean(origin));

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
    setDragY(null);
    const container = containerRect();
    if (!origin || !container) {
      onClose();
      return;
    }
    setFrame(frameOf(origin.rest, container));
    setTimeout(onClose, DURATION_MS);
  };
  const closeRef = useRef(close);
  closeRef.current = close;

  // 맨 위에서 끌어내리기. 터치는 스크롤과 다퉈야 해서 touchmove 를 직접 막고(passive: false),
  // 마우스는 포인터로 받는다 — 터치까지 포인터로 받으면 브라우저가 스크롤로 가져가며 끊는다.
  useEffect(() => {
    const scroller = scrollRef.current;
    const panel = panelRef.current;
    if (!scroller || !panel) return;
    let startY: number | null = null;
    let lastDy = 0;

    const begin = (y: number) => {
      startY = scroller.scrollTop <= 0 ? y : null;
      lastDy = 0;
    };
    const move = (y: number) => {
      if (startY === null) return false;
      const dy = y - startY;
      if (dy <= 0 && lastDy <= 0) {
        startY = null; // 위로 밀면 그냥 스크롤이다.
        return false;
      }
      lastDy = Math.max(dy, 0);
      setDragY(lastDy);
      return true;
    };
    const end = () => {
      if (startY === null) return;
      startY = null;
      if (lastDy > CLOSE_THRESHOLD_PX) closeRef.current();
      else setDragY(null);
    };

    const onTouchStart = (e: TouchEvent) => begin(e.touches[0]?.clientY ?? 0);
    const onTouchMove = (e: TouchEvent) => {
      if (move(e.touches[0]?.clientY ?? 0)) e.preventDefault();
    };
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      begin(e.clientY);
      const onMove = (m: PointerEvent) => move(m.clientY);
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        end();
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    };

    panel.addEventListener('touchstart', onTouchStart, { passive: true });
    panel.addEventListener('touchmove', onTouchMove, { passive: false });
    panel.addEventListener('touchend', end);
    panel.addEventListener('touchcancel', end);
    panel.addEventListener('pointerdown', onPointerDown);
    return () => {
      panel.removeEventListener('touchstart', onTouchStart);
      panel.removeEventListener('touchmove', onTouchMove);
      panel.removeEventListener('touchend', end);
      panel.removeEventListener('touchcancel', end);
      panel.removeEventListener('pointerdown', onPointerDown);
    };
  }, []);

  const style: CSSProperties = {
    top: frame.top + (dragY ?? 0),
    left: frame.left,
    right: frame.right,
    bottom: frame.bottom,
    borderRadius: dragY === null ? frame.radius : CARD_RADIUS_PX,
    transition:
      dragY === null && !instant
        ? ['top', 'left', 'right', 'bottom', 'border-radius']
            .map((prop) => `${prop} ${DURATION_MS}ms ${EASE}`)
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
        <div aria-hidden="true" className="flex justify-center pt-3 pb-6">
          <span className="h-1 w-20 rounded-full bg-gray-20" />
        </div>
        <PlaceDetail
          key={place.id}
          place={place}
          expanded
          userCoords={userCoords}
          onClose={close}
          onSelectPlace={onSelectPlace}
        />
      </div>
    </section>
  );
}
