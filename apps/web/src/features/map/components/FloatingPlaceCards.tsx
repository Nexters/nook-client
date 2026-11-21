import { type PointerEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { usePlaceDetail } from '@/features/map/api/queries';
import { PlaceDetail } from '@/features/map/components/PlaceDetail';
import type { CardOrigin } from '@/features/map/components/PlaceFullSheet';
import type { Coordinates } from '@/shared/lib/geolocation';
import { usePointerDragScroll } from '@/shared/lib/usePointerDragScroll';
import { cn } from '@/shared/lib/utils';
import { Badge } from '@/shared/ui';
import { CarouselIndicator } from '@/shared/ui/carousel-indicator';
import {
  type GestureSample,
  releaseVelocity,
  sampleGesture,
  shouldAdvanceSheet,
} from './sheet-gesture';

/** 카드 사이 간격(px) — 시안 `홈_지도` 403:18114 와 옆 카드(403:18099) 사이 4px. */
const CARD_GAP_PX = 4;
/** 손을 뗀 뒤 관성 스크롤이 멈췄다고 볼 시간. 그 전엔 선택을 바꾸지 않는다(지도가 매 칸마다 따라 움직이지 않게). */
const SCROLL_SETTLE_MS = 120;
/** 세로로 이만큼 넘게 끌어야 접기·펼치기·전체 화면으로 본다. 그 아래는 탭·흔들림이다. */
const DRAG_THRESHOLD_PX = 40;
/** 손이 이만큼 움직이면 가로(카드 넘기기)인지 세로(높이 끌기)인지 정한다. */
const AXIS_LOCK_PX = 8;
/**
 * 접힌 카드의 아래 여백과 사진 위 간격(gap-3) — 접힌 높이 = 사진 시작점 - 간격 + 아래 여백.
 * 펼친 카드는 따로 여백이 없다 — 사진 아래 인디케이터 줄(28px)이 곧 바닥이다(시안 405:18473).
 */
const COLLAPSED_BOTTOM_PADDING_PX = 20;
const PHOTO_GAP_PX = 12;
/** 펼친 카드를 끌어올릴 때 늘어날 수 있는 최대치(화면 높이 비율). 놓으면 풀업이 이어받는다. */
const MAX_STRETCH_RATIO = 0.85;
/** 지도 시트(vaul)와 같은 곡선·시간 — 손을 놓은 뒤 제자리를 찾아가는 모습을 맞춘다. */
const SETTLE_TRANSITION = 'height 0.5s cubic-bezier(0.32, 0.72, 0, 1)';

/** 카드 한 칸의 폭(카드 + 간격). 카드 폭은 모두 같다. */
function stepOf(scroller: HTMLElement) {
  const first = scroller.firstElementChild;
  return first instanceof HTMLElement ? first.offsetWidth + CARD_GAP_PX : 0;
}

/**
 * 검색 결과 지도의 플로팅 장소 카드 — Figma `장소 카드 플로팅 > 스와이프`(403:18114), NOOK-383.
 *
 * `placeIds` 가 여럿이면 검색 결과 순서대로 좌우로 넘기고 양옆 카드가 살짝 보인다. 검색 결과에
 * 없는 주변 핀을 고른 경우엔 그 한 장만 넘겨받아 미리보기·스와이프 없이 단일 카드가 된다.
 *
 * 선택의 주인은 바깥(URL 의 `?placeId=`)이다 — 넘겨서 멈추면 `onActiveIndexChange` 로 알리고,
 * 핀을 눌러 바깥에서 바뀌면 그 카드로 스크롤해 따라간다.
 *
 * 높이는 세 단계다(Figma `아래로 접기`·`풀업`) — 접힘(이름·주소·태그) ↔ 기본(사진까지) → 전체 화면.
 * 접힘은 모든 카드가 함께 접히고, 전체 화면은 바깥이 따로 그린다(`onExpandFull`).
 * 끄는 동안엔 카드 높이가 손을 따라가고, 놓으면 지도 시트와 같은 곡선으로 다음 높이에 앉는다.
 */
export function FloatingPlaceCards({
  placeIds,
  activeIndex,
  collapsed,
  fullOpen = false,
  userCoords,
  onActiveIndexChange,
  onCollapsedChange,
  onExpandFull,
  onCoverageChange,
  onClose,
  onSelectPlace,
}: {
  placeIds: number[];
  activeIndex: number;
  collapsed: boolean;
  /** 지금 카드가 풀업으로 커져 있는 동안 — 풀업이 그 카드 행세를 하므로 진짜 카드는 가린다. */
  fullOpen?: boolean;
  userCoords?: Coordinates | null;
  onActiveIndexChange: (index: number) => void;
  onCollapsedChange: (collapsed: boolean) => void;
  /**
   * 펼친 카드를 위로 끌어올렸을 때 — 지금 카드가 커져 화면을 채우도록 그 자리를 넘긴다.
   * 풀업은 손을 놓은 자리에서 커지고 닫힐 땐 쉬는 자리로 줄어든다.
   */
  onExpandFull: (origin: CardOrigin) => void;
  /**
   * 카드가 쉬는 높이에서 화면 아래를 덮는 비율(0~1) — 지도 시트의 스냅처럼 쓴다. 선택 핀을 카드 위
   * 남은 영역에 두고 현재 위치 버튼을 카드 위에 띄우는 데 쓴다. 카드 높이는 고정이지만 화면 높이가
   * 기기마다 달라서 0.5 로 가정하면 작은 화면에서 버튼이 카드에 가린다(NOOK-431).
   */
  onCoverageChange?: (coverage: number) => void;
  /** 카드 닫기 — 검색 결과 지도는 그대로 남는다. */
  onClose: () => void;
  onSelectPlace: (placeId: number) => void;
}) {
  const scrollerRef = useRef<HTMLElement>(null);
  const pointerDrag = usePointerDragScroll(scrollerRef, {
    count: placeIds.length,
    gap: CARD_GAP_PX,
    onIndexChange: onActiveIndexChange,
  });
  const settleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // 처음 그릴 땐 고른 카드에 바로 서 있어야 한다 — 첫 카드에서 미끄러져 오면 어색하다.
  const mountedRef = useRef(false);
  // 세로로 끄는 중인 거리(아래가 +). 모든 카드가 함께 늘고 준다. 끄는 중이 아니면 null.
  const [dragDy, setDragDy] = useState<number | null>(null);
  const coverageRef = useRef<number | null>(null);
  // 끄는 중엔 재지 않는다 — 쉬는 높이 기준이라 손을 따라 늘고 주는 동안 지도가 흔들리면 안 된다.
  useLayoutEffect(() => {
    const card = scrollerRef.current?.children[activeIndex];
    const container = scrollerRef.current?.parentElement?.parentElement;
    if (!onCoverageChange || dragDy !== null || !(card instanceof HTMLElement) || !container)
      return;
    const restHeight = Number(collapsed ? card.dataset.collapsedHeight : card.dataset.restHeight);
    const box = container.getBoundingClientRect();
    if (!restHeight || box.height <= 0) return;
    const coverage = (box.bottom - (card.getBoundingClientRect().bottom - restHeight)) / box.height;
    if (coverageRef.current !== null && Math.abs(coverageRef.current - coverage) < 0.005) return;
    coverageRef.current = coverage;
    onCoverageChange(coverage);
  });

  // 마우스로 끌고 놓으면 click 이 뒤따라 온다 — 끌기였다면 그 click 은 버튼에 닿지 않게 삼킨다.
  const suppressClickRef = useRef(false);

  // 한 제스처의 축 — 포인터 핸들러와 터치 리스너(아래)가 같은 판정을 공유한다.
  const gestureRef = useRef<{ x: number; y: number; axis: 'x' | 'y' | null } | null>(null);
  const decideAxis = (dx: number, dy: number) => {
    const gesture = gestureRef.current;
    if (!gesture) return null;
    if (gesture.axis === null && Math.hypot(dx, dy) >= AXIS_LOCK_PX) {
      // 가로가 더 길면 카드 넘기기다 — 브라우저 스크롤에 맡기고 높이는 건드리지 않는다.
      gesture.axis = Math.abs(dy) > Math.abs(dx) ? 'y' : 'x';
      // 세로로 정해지면 가로 스크롤을 잠근다 — 비스듬히 끌 때 카드가 옆으로 같이 밀리지 않게.
      const scroller = scrollerRef.current;
      if (gesture.axis === 'y' && scroller) {
        lockedLeftRef.current = scroller.scrollLeft;
        scroller.style.overflowX = 'hidden';
      }
    }
    return gesture.axis;
  };
  const lockedLeftRef = useRef<number | null>(null);
  const unlockHorizontal = () => {
    const scroller = scrollerRef.current;
    if (scroller && lockedLeftRef.current !== null) {
      scroller.style.overflowX = '';
      scroller.scrollLeft = lockedLeftRef.current;
    }
    lockedLeftRef.current = null;
  };

  // iOS 는 세로가 주인 제스처에서도 손이 살짝 비스듬하면 가로 스크롤을 시작하고, 그대로
  // 터치를 가져가 pointercancel 을 보낸다(열다가 툭 끊겨 들썩이는 원인). 세로로 정해진 뒤의
  // touchmove 는 기본 동작을 막아 제스처를 끝까지 우리 것으로 둔다. passive:false 라 React
  // 이벤트가 아니라 직접 붙인다.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const onTouchMove = (e: TouchEvent) => {
      const gesture = gestureRef.current;
      const touch = e.touches[0];
      if (!gesture || !touch) return;
      const axis = decideAxis(touch.clientX - gesture.x, touch.clientY - gesture.y);
      if (axis === 'y' && e.cancelable) e.preventDefault();
    };
    scroller.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => scroller.removeEventListener('touchmove', onTouchMove);
  });

  // 포인터라 터치·마우스 둘 다 받는다. 카드 밖으로 나가도 놓치지 않게 이동·떼기는 window 에서 받는다.
  const handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    suppressClickRef.current = false;
    const start = { x: event.clientX, y: event.clientY, time: performance.now() };
    const samples: GestureSample[] = [{ position: 0, time: start.time }];
    gestureRef.current = { x: start.x, y: start.y, axis: null };
    const handleMove = (move: globalThis.PointerEvent) => {
      const axis = decideAxis(move.clientX - start.x, move.clientY - start.y);
      if (axis === 'y') {
        const dy = move.clientY - start.y;
        sampleGesture(samples, dy, performance.now());
        setDragDy(dy);
      }
    };
    const handleEnd = (end: globalThis.PointerEvent) => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleEnd);
      window.removeEventListener('pointercancel', handleEnd);
      const axis = gestureRef.current?.axis ?? null;
      gestureRef.current = null;
      unlockHorizontal();
      setDragDy(null);
      if (axis !== 'y' || end.type === 'pointercancel') return;
      suppressClickRef.current = true;
      const dy = end.clientY - start.y;
      const velocity = releaseVelocity(samples, performance.now());
      if (!shouldAdvanceSheet(dy, velocity, DRAG_THRESHOLD_PX)) return;
      if (dy > 0) onCollapsedChange(true);
      else if (collapsed) onCollapsedChange(false);
      else {
        const card = scrollerRef.current?.children[activeIndex];
        if (!(card instanceof HTMLElement)) return;
        const from = card.getBoundingClientRect();
        // 쉬는 높이는 아래 끝을 그대로 두고 카드가 원래 높이일 때의 자리다.
        const restHeight = Number(card.dataset.restHeight) || from.height;
        const rest = new DOMRect(from.x, from.bottom - restHeight, from.width, restHeight);
        onExpandFull({ from, rest });
      }
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleEnd);
    window.addEventListener('pointercancel', handleEnd);
  };

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const step = scroller ? stepOf(scroller) : 0;
    if (scroller && step > 0 && Math.round(scroller.scrollLeft / step) !== activeIndex) {
      scroller.scrollTo({
        left: step * activeIndex,
        behavior: mountedRef.current ? 'smooth' : 'instant',
      });
    }
    mountedRef.current = true;
  }, [activeIndex]);

  useEffect(() => () => clearTimeout(settleTimer.current), []);

  const handleScroll = () => {
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      const scroller = scrollerRef.current;
      if (!scroller) return;
      const step = stepOf(scroller);
      if (step <= 0) return;
      const next = Math.min(
        Math.max(Math.round(scroller.scrollLeft / step), 0),
        placeIds.length - 1,
      );
      if (next !== activeIndex) onActiveIndexChange(next);
    }, SCROLL_SETTLE_MS);
  };

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-10"
      // 시안은 홈 인디케이터 영역(아래 20px) 바로 위에 카드가 앉는다 — safe-area(34px)까지 띄우면 너무 뜬다.
      style={{ bottom: '1.25rem' }}
    >
      <section
        {...pointerDrag}
        ref={scrollerRef}
        aria-label="검색 결과 장소"
        aria-roledescription="캐러셀"
        onPointerDown={(event) => {
          pointerDrag.onPointerDown(event);
          handlePointerDown(event);
        }}
        onClickCapture={(event) => {
          pointerDrag.onClickCapture(event);
          if (!suppressClickRef.current) return;
          suppressClickRef.current = false;
          event.stopPropagation();
          event.preventDefault();
        }}
        onScroll={placeIds.length > 1 ? handleScroll : undefined}
        style={{ gap: CARD_GAP_PX }}
        className={cn(
          'pointer-events-auto flex items-end px-3',
          placeIds.length > 1
            ? 'snap-x snap-mandatory scroll-px-3 overflow-x-auto overscroll-x-contain'
            : 'overflow-hidden',
          '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        )}
      >
        {placeIds.map((placeId, index) => (
          <FloatingPlaceCard
            key={placeId}
            placeId={placeId}
            // 보이는 카드와 양옆만 상세를 받는다 — 결과가 많아도 한꺼번에 다 부르지 않는다.
            enabled={Math.abs(index - activeIndex) <= 1}
            collapsed={collapsed}
            hidden={fullOpen && index === activeIndex}
            dragDy={dragDy}
            userCoords={userCoords}
            onCollapsedChange={onCollapsedChange}
            onClose={onClose}
            onSelectPlace={onSelectPlace}
          />
        ))}
      </section>
    </div>
  );
}

function FloatingPlaceCard({
  placeId,
  enabled,
  collapsed,
  hidden,
  dragDy,
  userCoords,
  onCollapsedChange,
  onClose,
  onSelectPlace,
}: {
  placeId: number;
  enabled: boolean;
  collapsed: boolean;
  hidden: boolean;
  dragDy: number | null;
  userCoords?: Coordinates | null;
  onCollapsedChange: (collapsed: boolean) => void;
  onClose: () => void;
  onSelectPlace: (placeId: number) => void;
}) {
  const { data: place } = usePlaceDetail(enabled ? placeId : null);
  // 높이를 손에 맞춰 움직이려면 펼친·접힌 높이를 숫자로 알아야 한다 — 내용(사진은 늘 그려 둔다)을
  // 감싼 안쪽 상자를 재서 구한다. 카드 자체는 높이를 강제로 받으니 바깥을 재면 안 된다.
  const contentRef = useRef<HTMLDivElement>(null);
  const [heights, setHeights] = useState<{ open: number; collapsed: number } | null>(null);
  useLayoutEffect(() => {
    const content = contentRef.current;
    const photos = content?.querySelector<HTMLElement>('[data-slot=place-photos]');
    if (!content || !photos) return;
    const next = {
      open: content.offsetHeight,
      collapsed: photos.offsetTop - PHOTO_GAP_PX + COLLAPSED_BOTTOM_PADDING_PX,
    };
    setHeights((prev) =>
      prev?.open === next.open && prev.collapsed === next.collapsed ? prev : next,
    );
  });

  let height: number | undefined;
  if (heights) {
    const rest = collapsed ? heights.collapsed : heights.open;
    const max = collapsed ? heights.open : window.innerHeight * MAX_STRETCH_RATIO;
    height = dragDy === null ? rest : Math.min(Math.max(rest - dragDy, heights.collapsed), max);
  }

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: 접힌 카드 탭 펼치기는 끌어올리기의 보조 경로다 — 카드 안 버튼·링크는 각자 키보드로 닿는다
    <section
      aria-label={place?.name ?? '장소'}
      data-rest-height={heights?.open}
      data-collapsed-height={heights?.collapsed}
      style={{ height, transition: dragDy === null ? SETTLE_TRANSITION : 'none' }}
      // 접힌 카드를 누르면 기본 높이로 편다(시안 메모) — 안의 버튼·링크는 제 할 일을 한다.
      onClick={(event) => {
        if (collapsed && !(event.target as Element).closest('button, a')) {
          onCollapsedChange(false);
        }
      }}
      className={cn(
        // 스크롤러 좌우 패딩(12px)을 뺀 폭이 곧 카드 폭이라 다음 카드가 간격(4px) 뒤로 8px 만 비친다.
        // 세로 끌기는 브라우저가 스크롤로 가져가지 않게 막는다 — 가져가면 pointercancel 로 끊긴다.
        // 가로(카드·사진 넘기기)는 그대로 둔다.
        'w-full shrink-0 touch-pan-x snap-start overflow-hidden rounded-[14px] bg-gray-0 px-4',
        hidden && 'invisible',
        'drop-shadow-[2px_2px_24.4px_rgba(0,0,0,0.1)]',
        // 카드 안 사진 캐러셀이 끝에 닿아도 바깥 카드 스와이프로 이어지지 않게 끊는다 —
        // 사진을 넘기다 다음 장소로 넘어가 버리면 안 된다(NOOK-383).
        '[&_[data-slot=carousel]>div]:overscroll-x-contain',
      )}
    >
      <div ref={contentRef} className="relative">
        {/* 드래그 핸들 — 카드 어디를 끌어도 되지만 끌 수 있다는 표시다. */}
        <div aria-hidden="true" className="flex justify-center pt-3 pb-5">
          <span className="h-1 w-20 rounded-full bg-gray-20" />
        </div>
        {place ? (
          <PlaceDetail
            place={place}
            expanded={false}
            // 내용이 비어도 카드 높이가 장소마다 달라지지 않게 자리를 지킨다(NOOK-383).
            keepEmptySlots
            userCoords={userCoords}
            onClose={onClose}
            onSelectPlace={onSelectPlace}
          />
        ) : (
          // 상세가 오기 전 자리 — 실제 카드와 같은 줄 구성(이름·주소·태그·사진·인디케이터)으로 깔아
          // 상세가 와도 카드 높이가 그대로다. 높이는 숫자가 아니라 같은 글자·배지·인디케이터가 정한다.
          <div aria-hidden="true" className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              {/* 이름 줄 높이는 오른쪽 저장·닫기 버튼(32px)이 정한다. */}
              <div className="flex h-8 items-center">
                <div className="h-7 w-1/2 rounded bg-gray-10" />
              </div>
              <div className="relative">
                <p className="invisible text-b2">-</p>
                <div className="absolute inset-y-0 left-0 w-3/4 rounded bg-gray-10" />
              </div>
              <div className="invisible flex py-2">
                <Badge variant="label">-</Badge>
              </div>
            </div>
            <div data-slot="place-photos">
              <div className="h-[198px] w-full rounded bg-gray-10" />
              <CarouselIndicator count={2} activeIndex={0} className="invisible py-3" />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
