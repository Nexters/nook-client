import type * as React from 'react';
import { useRef, useState } from 'react';

/** 손을 뗐을 때 이만큼 가로로 옮겨 갔으면 넘긴 것으로 본다. */
const SWIPE_DISTANCE = 56;
/** 이만큼 움직이기 전에는 가로인지 세로인지 정하지 않는다 — 손끝 흔들림으로 방향이 정해지면 안 된다. */
const DIRECTION_LOCK = 12;
/**
 * 좌우 가장자리 이 폭 안에서 시작한 손가락은 건드리지 않는다. iOS 셸의 엣지 스와이프
 * 뒤로/앞으로가 그 구역의 임자라(`shared/lib/backGesture`), 여기서 탭까지 넘기면
 * 화면을 떠나면서 탭도 바뀐다.
 */
const EDGE_GUARD = 32;

type Axis = 'undecided' | 'horizontal' | 'vertical';

/**
 * 가로로 스크롤되는 조상이 있으면 그 제스처의 임자는 그쪽이다 — 이미지 캐러셀
 * (`shared/ui/carousel`)·칩 줄처럼 손가락으로 옆으로 미는 영역이 여기 걸린다.
 * 지도처럼 스크롤 컨테이너가 아닌 채로 제스처를 먹는 영역은 `data-no-swipe` 로 알린다.
 */
function ownedByInnerGesture(target: EventTarget | null, root: HTMLElement): boolean {
  let node = target instanceof Element ? target : null;

  while (node && node !== root) {
    if (node.hasAttribute('data-no-swipe')) return true;
    if (node.scrollWidth > node.clientWidth) {
      const { overflowX } = getComputedStyle(node);
      if (overflowX === 'auto' || overflowX === 'scroll') return true;
    }
    node = node.parentElement;
  }

  return false;
}

interface HorizontalSwipeOptions {
  /** 손가락이 왼쪽으로 — 다음(오른쪽) 화면으로 넘어간다. 인자는 손을 뗀 지점까지의 거리(px). */
  onSwipeLeft: (distance: number) => void;
  /** 손가락이 오른쪽으로 — 이전(왼쪽) 화면으로 돌아간다. 인자는 그 거리(px). */
  onSwipeRight: (distance: number) => void;
  /** false 면 아무것도 듣지 않는다(넘길 상대가 없는 화면). */
  enabled?: boolean;
}

/**
 * 좌우로 쓸어 화면을 넘기는 제스처. 반환한 핸들러를 넘김 대상 영역에 그대로 편다.
 *
 * `useSwipeDownToDismiss` 와 같은 이유로 포인터가 아니라 터치 이벤트로 판정한다 —
 * 안쪽에 스크롤 컨테이너가 있으면 브라우저가 제스처를 가져가며 pointercancel 만 보낸다.
 * 첫 움직임에서 축을 한 번 정하고 그 뒤로는 바꾸지 않는다. 세로로 정해졌으면 목록
 * 스크롤이 제 몫을 그대로 갖는다.
 *
 * 끄는 동안의 거리를 `offset` 으로 내보낸다 — 손가락을 따라 화면이 함께 움직여야
 * "넘기는 중"이 보인다. 넘길지 말지는 손을 뗄 때 거리로 판정한다.
 */
export function useHorizontalSwipe({
  onSwipeLeft,
  onSwipeRight,
  enabled = true,
}: HorizontalSwipeOptions) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const axis = useRef<Axis>('undecided');
  const [offset, setOffset] = useState(0);
  // 손을 뗀 뒤 제자리로 돌아갈 때만 애니메이션을 건다. 끄는 동안에는 손가락을 그대로 따라야 한다.
  const [returning, setReturning] = useState(false);

  const release = () => {
    start.current = null;
    axis.current = 'undecided';
  };

  const settle = () => {
    release();
    setReturning(true);
    setOffset(0);
  };

  return {
    /** 지금 손가락이 가로로 끌고 온 거리(px). 세로로 굳었거나 손을 뗐으면 0 이다. */
    offset,
    /** 이 값이 true 인 동안에만 되돌아가는 transition 을 건다. */
    returning,
    handlers: {
      onTouchStart: (event: React.TouchEvent<HTMLElement>) => {
        release();
        setReturning(false);
        setOffset(0);
        // 손가락이 둘 이상이면(핀치 등) 아예 보지 않는다 — 두 번째 손가락이 닿는 순간
        // 이 분기가 다시 돌면서 진행 중이던 판정도 버린다.
        const touch = enabled && event.touches.length === 1 ? event.touches[0] : undefined;
        if (!touch) return;
        if (touch.clientX < EDGE_GUARD || window.innerWidth - touch.clientX < EDGE_GUARD) return;
        if (ownedByInnerGesture(event.target, event.currentTarget)) return;

        start.current = { x: touch.clientX, y: touch.clientY };
      },
      onTouchMove: (event: React.TouchEvent<HTMLElement>) => {
        const from = start.current;
        const touch = event.touches.length === 1 ? event.touches[0] : undefined;
        if (!from || !touch) return;

        const movedSideways = touch.clientX - from.x;
        const movedDown = touch.clientY - from.y;
        if (axis.current === 'undecided') {
          if (Math.abs(movedSideways) < DIRECTION_LOCK && Math.abs(movedDown) < DIRECTION_LOCK)
            return;
          axis.current = Math.abs(movedSideways) > Math.abs(movedDown) ? 'horizontal' : 'vertical';
        }
        // 가로로 굳었을 때만 따라간다 — 세로면 목록 스크롤이 제 몫을 그대로 갖는다.
        if (axis.current === 'horizontal') setOffset(movedSideways);
      },
      onTouchEnd: (event: React.TouchEvent<HTMLElement>) => {
        const from = start.current;
        const wasHorizontal = axis.current === 'horizontal';
        const touch = event.changedTouches[0];
        settle();
        if (!from || !touch || !wasHorizontal) return;

        const movedSideways = touch.clientX - from.x;
        if (movedSideways <= -SWIPE_DISTANCE) onSwipeLeft(-movedSideways);
        else if (movedSideways >= SWIPE_DISTANCE) onSwipeRight(movedSideways);
      },
      onTouchCancel: settle,
    },
  };
}
