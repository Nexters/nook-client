import * as React from 'react';
import { useState } from 'react';
import { useHorizontalSwipe } from '@/shared/lib/useHorizontalSwipe';
import { cn } from '@/shared/lib/utils';

/** 손을 뗀 뒤 남은 거리를 마저 가는 데 쓰는 최대·최소 시간. */
const SETTLE_MAX_MS = 240;
const SETTLE_MIN_MS = 90;

export interface SwipePagerProps {
  /** 지금 보고 있는 패널. 탭 버튼과 같은 상태를 쓴다. */
  index: number;
  onIndexChange: (index: number) => void;
  /** 패널들. 순서가 곧 좌→우 배치다. */
  children: React.ReactNode;
  className?: string;
}

/**
 * 좌우로 쓸어 넘기는 패널 묶음(아카이브 상세의 게시물/장소 탭).
 *
 * 탭 상태만 바꾸면 화면이 툭 갈아끼워져 "넘겼다"는 느낌이 없다 — 끄는 동안 패널이
 * 손가락을 따라오고, 놓으면 남은 만큼만 마저 흘러간 다음 탭이 바뀐다. 남은 거리에
 * 비례해 시간을 정하는 건 지도 시트의 스냅과 같은 이유다(`place-sheet-layout`) —
 * 조금 끌다 놓았는데 한 화면을 같은 시간에 건너가면 손을 떠난 순간 갑자기 빨라진다.
 *
 * 보고 있는 패널만 문서 흐름에 두고 이웃은 absolute 로 양옆에 얹는다. 흐름에 같이 두면
 * 묶음 높이가 두 패널 중 큰 쪽으로 잡혀, 짧은 탭에서 빈 공간까지 스크롤된다.
 *
 * ponytail: 이웃 패널을 처음부터 그린다 — 두 탭의 데이터는 어차피 같이 받아 두므로
 * (`useArchivePosts`·`useArchivePlaces`) 추가 비용은 안 보이는 탭의 썸네일 요청뿐이다.
 * 그게 무거워지면 첫 터치 시점에 그리도록 미루면 된다.
 */
function SwipePager({ index, onIndexChange, children, className }: SwipePagerProps) {
  const panes = React.Children.toArray(children);
  // 손을 뗀 뒤 넘어가는 중인 방향. 다 흘러가면 그때 index 를 넘긴다.
  const [settling, setSettling] = useState<-1 | 1 | null>(null);
  // 넘어간 직후 한 박자. 여기서 transition 을 끄지 않으면 자리를 0 으로 되돌리는 것까지
  // 애니메이션이 걸려서, 밀려 나간 패널이 반대쪽에서 한 번 더 미끄러져 들어온다.
  const [justSwitched, setJustSwitched] = useState(false);
  const [width, setWidth] = useState(0);
  // 손을 뗀 지점까지 온 거리. 남은 만큼만 마저 가도록 시간을 정하는 데 쓴다 —
  // 훅은 손을 떼는 순간 offset 을 0 으로 되돌리므로 그 값으로는 알 수 없다.
  const [released, setReleased] = useState(0);

  const settleTo = (direction: -1 | 1, distance: number) => {
    setReleased(distance);
    setSettling(direction);
  };

  const swipe = useHorizontalSwipe({
    enabled: settling === null,
    onSwipeLeft: (distance) => panes[index + 1] && settleTo(1, distance),
    onSwipeRight: (distance) => panes[index - 1] && settleTo(-1, distance),
  });

  // 이웃이 없는 쪽으로는 따라가지 않는다 — 빈 자리가 끌려 들어온다.
  const blocked =
    (swipe.offset < 0 && !panes[index + 1]) || (swipe.offset > 0 && !panes[index - 1]);
  const offset = blocked ? 0 : swipe.offset;
  const animating = !justSwitched && (settling !== null || swipe.returning);

  // 남은 거리에 비례한 시간 — 끝까지 끌고 왔으면 거의 즉시, 살짝 끌었으면 그만큼 더 걸린다.
  const remaining = settling ? Math.max(width - released, 0) : Math.abs(offset);
  const duration = width
    ? Math.max(Math.round((remaining / width) * SETTLE_MAX_MS), SETTLE_MIN_MS)
    : SETTLE_MAX_MS;

  return (
    // 양옆에 얹은 이웃이 가로 스크롤을 만들지 않게 잘라낸다. hidden 이 아니라 clip 인
    // 이유는 셸(providers.tsx)과 같다 — hidden 은 스크롤 컨테이너를 만든다.
    <div
      ref={(node) => setWidth(node?.clientWidth ?? 0)}
      className={cn('overflow-x-clip', className)}
    >
      <div
        className={cn('relative', animating && 'transition-transform ease-out')}
        style={{
          transform: settling ? `translateX(${-settling * 100}%)` : `translateX(${offset}px)`,
          transitionDuration: animating ? `${duration}ms` : undefined,
        }}
        onTransitionEnd={(event) => {
          // 패널 안쪽 전환이 올라온 것과 구분한다.
          if (event.target !== event.currentTarget || settling === null) return;
          onIndexChange(index + settling);
          setSettling(null);
          setJustSwitched(true);
        }}
        {...swipe.handlers}
        onTouchStart={(event) => {
          setJustSwitched(false);
          swipe.handlers.onTouchStart(event);
        }}
      >
        {panes[index]}
        {panes[index - 1] ? (
          <div className="absolute inset-x-0 top-0 -translate-x-full">{panes[index - 1]}</div>
        ) : null}
        {panes[index + 1] ? (
          <div className="absolute inset-x-0 top-0 translate-x-full">{panes[index + 1]}</div>
        ) : null}
      </div>
    </div>
  );
}

export { SwipePager };
