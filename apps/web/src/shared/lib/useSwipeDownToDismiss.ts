import type * as React from 'react';
import { useRef, useState } from 'react';

/** 이만큼 아래로 끌고 놓으면 닫는다. 못 미치면 원위치로 돌아간다. */
const DISMISS_DISTANCE = 100;
/** 이만큼 움직이기 전에는 세로인지 가로인지 정하지 않는다 — 손끝 흔들림으로 방향이 정해지면 안 된다. */
const DIRECTION_LOCK = 8;
/** 배경이 이 거리까지 내려가는 동안 아래 값까지 옅어진다. */
const FADE_DISTANCE = 320;
const MIN_BACKDROP_OPACITY = 0.3;

type Axis = 'undecided' | 'vertical' | 'horizontal';

/**
 * 전체화면 확대뷰를 아래로 쓸어내려 닫는 제스처.
 *
 * 끄는 동안 내용이 손가락을 따라 내려가고 배경이 옅어져 뒤 화면이 비친다. 손을 뗐을 때
 * `DISMISS_DISTANCE` 를 넘겼으면 닫고, 못 미치면 제자리로 돌아간다.
 *
 * 포인터가 아니라 터치 이벤트로 판정한다. 확대뷰 안의 캐러셀이 가로 스크롤 컨테이너라,
 * 실기기에서 손가락을 움직이면 브라우저가 그 제스처를 스크롤로 가져가며 pointercancel 을
 * 보내고 pointerup 을 주지 않는다 — pointerup 에서 판정하면 실기기에서만 닫히지 않는다.
 *
 * 첫 움직임에서 축을 한 번 정하고 그 뒤로는 바꾸지 않는다. 사진을 옆으로 넘기다가 손이 조금
 * 내려가도 캐러셀이 계속 제 몫을 갖게 하려는 것이다. 손가락이 둘 이상이면 아예 보지 않는다.
 */
export function useSwipeDownToDismiss(onDismiss: () => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const axis = useRef<Axis>('undecided');
  const [offset, setOffset] = useState(0);
  // 손을 뗀 뒤 제자리로 돌아갈 때만 애니메이션을 건다. 끄는 동안에는 손가락을 그대로 따라야 한다.
  const [returning, setReturning] = useState(false);

  const release = () => {
    start.current = null;
    axis.current = 'undecided';
  };

  return {
    /** 내용을 아래로 밀어낼 거리(px). */
    offset,
    /** 이 값이 true 인 동안에만 되돌아가는 transition 을 건다. */
    returning,
    /** 배경 불투명도 — 내려갈수록 옅어져 뒤 화면이 비친다. */
    backdropOpacity: 1 - Math.min(offset / FADE_DISTANCE, 1) * (1 - MIN_BACKDROP_OPACITY),
    handlers: {
      onTouchStart: (event: React.TouchEvent) => {
        const touch = event.touches.length === 1 ? event.touches[0] : undefined;
        if (!touch) {
          release();
          return;
        }
        start.current = { x: touch.clientX, y: touch.clientY };
        axis.current = 'undecided';
        setReturning(false);
      },
      onTouchMove: (event: React.TouchEvent) => {
        const from = start.current;
        const touch = event.touches.length === 1 ? event.touches[0] : undefined;
        if (!from || !touch) return;

        const movedSideways = touch.clientX - from.x;
        const movedDown = touch.clientY - from.y;
        if (axis.current === 'undecided') {
          if (Math.abs(movedSideways) < DIRECTION_LOCK && Math.abs(movedDown) < DIRECTION_LOCK) {
            return;
          }
          axis.current = Math.abs(movedDown) > Math.abs(movedSideways) ? 'vertical' : 'horizontal';
        }
        if (axis.current !== 'vertical') return;
        // 위로는 따라가지 않는다 — 닫기는 아래 방향만이다.
        setOffset(Math.max(movedDown, 0));
      },
      onTouchEnd: (event: React.TouchEvent) => {
        const from = start.current;
        const wasVertical = axis.current === 'vertical';
        const touch = event.changedTouches[0];
        release();
        if (from && touch && wasVertical && touch.clientY - from.y > DISMISS_DISTANCE) {
          onDismiss();
          return;
        }
        setReturning(true);
        setOffset(0);
      },
      onTouchCancel: () => {
        release();
        setReturning(true);
        setOffset(0);
      },
    },
  };
}
