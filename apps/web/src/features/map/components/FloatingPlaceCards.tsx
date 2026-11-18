import { useEffect, useLayoutEffect, useRef } from 'react';
import { usePlaceDetail } from '@/features/map/api/queries';
import { PlaceDetail } from '@/features/map/components/PlaceDetail';
import type { Coordinates } from '@/shared/lib/geolocation';
import { usePointerDragScroll } from '@/shared/lib/usePointerDragScroll';
import { cn } from '@/shared/lib/utils';
import { useExpandCardGesture } from './useExpandCardGesture';
import { usePlaceCarouselDepth } from './usePlaceCarouselDepth';

/** 카드 사이 간격(px) — 시안 `홈_지도` 403:18114 와 옆 카드(403:18099) 사이 4px. */
const CARD_GAP_PX = 4;
/** 손을 뗀 뒤 관성 스크롤이 멈췄다고 볼 시간. 그 전엔 선택을 바꾸지 않는다(지도가 매 칸마다 따라 움직이지 않게). */
const SCROLL_SETTLE_MS = 120;

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
 */
export function FloatingPlaceCards({
  placeIds,
  activeIndex,
  userCoords,
  onActiveIndexChange,
  onClose,
  onSelectPlace,
  onHeightChange,
  onExpand,
  onCollapse,
  compact = false,
}: {
  placeIds: number[];
  onHeightChange?: (height: number) => void;
  onExpand?: () => void;
  onCollapse?: () => void;
  compact?: boolean;
  activeIndex: number;
  userCoords?: Coordinates | null;
  onActiveIndexChange: (index: number) => void;
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
  usePlaceCarouselDepth(scrollerRef, placeIds.length, CARD_GAP_PX);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const step = scroller ? stepOf(scroller) : 0;
    if (scroller && step > 0 && Math.round(scroller.scrollLeft / step) !== activeIndex) {
      scroller.scrollTo({
        left: step * activeIndex,
        behavior:
          mountedRef.current && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
            ? 'smooth'
            : 'instant',
      });
    }
    mountedRef.current = true;
  }, [activeIndex]);

  useEffect(() => () => clearTimeout(settleTimer.current), []);

  // 현재 위치 버튼 등 카드 위에 얹는 요소는 '지금 보이는 카드'의 높이를 따라간다.
  // 줄 전체 높이(가장 높은 카드)를 쓰면 접거나 넘길 때 옆 카드 때문에 버튼이 따라오지 않는다.
  useLayoutEffect(() => {
    const active = scrollerRef.current?.children[activeIndex];
    if (!(active instanceof HTMLElement) || !onHeightChange) return;
    const report = () => onHeightChange(active.offsetHeight);
    report();
    const observer = new ResizeObserver(report);
    observer.observe(active);
    return () => observer.disconnect();
  }, [onHeightChange, activeIndex]);

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
      style={{ bottom: 'max(env(safe-area-inset-bottom), 1.25rem)' }}
    >
      <section
        {...pointerDrag}
        ref={scrollerRef}
        aria-label="검색 결과 장소"
        aria-roledescription="캐러셀"
        onScroll={placeIds.length > 1 ? handleScroll : undefined}
        style={{ gap: CARD_GAP_PX }}
        className={cn(
          'pointer-events-auto flex items-end',
          // 여러 장: 카드를 왼쪽 8px 에 붙여 다음 카드가 12px 비치게 한다(시안 42:2654).
          // 마지막 장은 스크롤 끝에 걸려 오른쪽 8px 에 붙고, 왼쪽에 이전 카드가 12px 비친다.
          placeIds.length > 1
            ? 'snap-x snap-mandatory scroll-px-2 px-2 overflow-x-auto overscroll-x-contain'
            : 'overflow-hidden px-3',
          '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        )}
      >
        {placeIds.map((placeId, index) => (
          <FloatingPlaceCard
            key={placeId}
            placeId={placeId}
            // 보이는 카드와 양옆만 상세를 받는다 — 결과가 많아도 한꺼번에 다 부르지 않는다.
            enabled={Math.abs(index - activeIndex) <= 1}
            // 기본: 오른쪽에 다음 카드만 비치고 왼쪽 이전 카드는 숨긴다.
            // 마지막 장: 다음 카드가 없으니 오른쪽은 비우고 왼쪽 이전 카드를 비춘다.
            multi={placeIds.length > 1}
            userCoords={userCoords}
            onClose={onClose}
            onSelectPlace={onSelectPlace}
            onExpand={onExpand}
            onCollapse={onCollapse}
            compact={compact}
          />
        ))}
      </section>
    </div>
  );
}

function FloatingPlaceCard({
  placeId,
  enabled,
  userCoords,
  onClose,
  onSelectPlace,
  onExpand,
  onCollapse,
  compact,
  multi = false,
}: {
  multi?: boolean;
  placeId: number;
  onExpand?: () => void;
  onCollapse?: () => void;
  compact: boolean;
  enabled: boolean;
  userCoords?: Coordinates | null;
  onClose: () => void;
  onSelectPlace: (placeId: number) => void;
}) {
  const expandGesture = useExpandCardGesture(onExpand, onCollapse);
  const { data: place } = usePlaceDetail(enabled ? placeId : null);

  return (
    <section
      {...expandGesture}
      aria-label={place?.name ?? '장소'}
      className={cn(
        // 카드 폭은 화면 - 24px 로 고정한다. 단일 카드는 좌우 12px 가운데, 여러 장은 스크롤러
        // 좌우 패딩(8px)에서 8px 를 더 빼 다음 카드가 간격(4px) 뒤로 12px 비친다.
        onExpand && 'touch-pan-x',
        multi ? 'w-[calc(100%-8px)] last:snap-end' : 'w-full',
        'shrink-0 snap-start',
        // 카드 안 사진 캐러셀이 끝에 닿아도 바깥 카드 스와이프로 이어지지 않게 끊는다 —
        // 사진을 넘기다 다음 장소로 넘어가 버리면 안 된다(NOOK-383).
        '[&_[data-slot=carousel]>div]:overscroll-x-contain',
      )}
    >
      <div
        data-place-card-surface
        className={cn(
          onExpand && 'touch-pan-x',
          'max-h-[calc(100dvh-8rem)] origin-bottom overflow-x-hidden overflow-y-auto overscroll-y-contain rounded-[14px] bg-gray-0 px-4 shadow-[2px_2px_24.4px_rgba(0,0,0,0.1)] [backface-visibility:hidden]',
        )}
      >
        <button
          type="button"
          data-expand-handle
          aria-label="장소 상세 전체 화면으로 확장"
          onClick={onExpand}
          className="relative flex h-9 w-full touch-none after:absolute after:inset-x-0 after:-inset-y-1 items-start justify-center pt-3 pb-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100"
        >
          <span aria-hidden="true" className="h-1 w-20 rounded-full bg-gray-20" />
        </button>
        {place ? (
          <PlaceDetail
            place={place}
            expanded={false}
            variant="floating"
            showPhotos={!compact}
            userCoords={userCoords}
            onClose={onClose}
            onSelectPlace={onSelectPlace}
          />
        ) : (
          // 상세가 오기 전 자리 — 카드 높이가 튀지 않게 제목·사진 자리만 깐다.
          // 접힌 상태에선 사진 자리도 접어 다른 카드와 함께 낮아진다.
          <div aria-hidden="true" className={cn('flex flex-col gap-3', compact ? 'pb-5' : 'pb-7')}>
            <div className="h-7 w-1/2 rounded bg-gray-10" />
            <div className="h-5 w-3/4 rounded bg-gray-10" />
            {compact ? null : <div className="aspect-[319/198] w-full rounded bg-gray-10" />}
          </div>
        )}
      </div>
    </section>
  );
}
