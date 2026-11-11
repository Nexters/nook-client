import { useEffect, useRef } from 'react';
import { usePlaceDetail } from '@/features/map/api/queries';
import { PlaceDetail } from '@/features/map/components/PlaceDetail';
import type { Coordinates } from '@/shared/lib/geolocation';
import { cn } from '@/shared/lib/utils';

/** 카드 사이 간격(px) — 시안 `홈_지도` 403:18114 와 옆 카드(403:18099) 사이 4px. */
const CARD_GAP_PX = 4;
/** 손을 뗀 뒤 관성 스크롤이 멈췄다고 볼 시간. 그 전엔 선택을 바꾸지 않는다(지도가 매 칸마다 따라 움직이지 않게). */
const SCROLL_SETTLE_MS = 120;

/** 카드 한 칸의 폭(카드 + 간격). 카드 폭은 모두 같다. */
function stepOf(scroller: HTMLDivElement) {
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
}: {
  placeIds: number[];
  activeIndex: number;
  userCoords?: Coordinates | null;
  onActiveIndexChange: (index: number) => void;
  /** 카드 닫기 — 검색 결과 지도는 그대로 남는다. */
  onClose: () => void;
  onSelectPlace: (placeId: number) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // 처음 그릴 땐 고른 카드에 바로 서 있어야 한다 — 첫 카드에서 미끄러져 오면 어색하다.
  const mountedRef = useRef(false);

  useEffect(() => {
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
      style={{ bottom: 'max(env(safe-area-inset-bottom), 1.25rem)' }}
    >
      <div
        ref={scrollerRef}
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
            userCoords={userCoords}
            onClose={onClose}
            onSelectPlace={onSelectPlace}
          />
        ))}
      </div>
    </div>
  );
}

function FloatingPlaceCard({
  placeId,
  enabled,
  userCoords,
  onClose,
  onSelectPlace,
}: {
  placeId: number;
  enabled: boolean;
  userCoords?: Coordinates | null;
  onClose: () => void;
  onSelectPlace: (placeId: number) => void;
}) {
  const { data: place } = usePlaceDetail(enabled ? placeId : null);

  return (
    <section
      aria-label={place?.name ?? '장소'}
      className={cn(
        // 스크롤러 좌우 패딩(12px)을 뺀 폭이 곧 카드 폭이라 다음 카드가 간격(4px) 뒤로 8px 만 비친다.
        'w-full shrink-0 snap-start overflow-hidden rounded-[14px] bg-gray-0 px-4 pb-5',
        'drop-shadow-[2px_2px_24.4px_rgba(0,0,0,0.1)]',
        // 카드 안 사진 캐러셀이 끝에 닿아도 바깥 카드 스와이프로 이어지지 않게 끊는다 —
        // 사진을 넘기다 다음 장소로 넘어가 버리면 안 된다(NOOK-383).
        '[&_[data-slot=carousel]>div]:overscroll-x-contain',
      )}
    >
      {/* 시안의 드래그 핸들 — 카드는 끌어 올리지 않아 모양만 맞춘다. */}
      <div aria-hidden="true" className="flex justify-center pt-3 pb-6">
        <span className="h-1 w-20 rounded-full bg-gray-20" />
      </div>
      {place ? (
        <PlaceDetail
          place={place}
          expanded={false}
          userCoords={userCoords}
          onClose={onClose}
          onSelectPlace={onSelectPlace}
        />
      ) : (
        // 상세가 오기 전 자리 — 카드 높이가 튀지 않게 제목·사진 자리만 깐다.
        <div aria-hidden="true" className="flex flex-col gap-3">
          <div className="h-7 w-1/2 rounded bg-gray-10" />
          <div className="h-5 w-3/4 rounded bg-gray-10" />
          <div className="h-[212px] w-full rounded bg-gray-10" />
        </div>
      )}
    </section>
  );
}
