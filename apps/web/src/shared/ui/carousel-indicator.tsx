import * as React from 'react';
import { cn } from '@/shared/lib/utils';

export interface CarouselIndicatorProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'onChange'> {
  count: number;
  activeIndex: number;
  onIndexChange?: (index: number) => void;
  getItemLabel?: (index: number) => string;
}

/** 점 크기(px). Figma `캐러셀 인디케이터` 의 Default / Small / XSmall. */
const SIZE_CLASS = {
  3: 'size-[3px]',
  4: 'size-[4px]',
  5: 'size-[5px]',
} as const;

type DotSize = keyof typeof SIZE_CLASS;

/** 이 수까지는 줄이지 않고 전부 노출한다. */
const FULL_DOTS_MAX = 5;
/** 크기 틀의 칸 수. 가운데 세 칸이 Default 이고 양옆으로 Small → XSmall 로 줄어든다. */
const SLOT_COUNT = 7;
/** 한 번에 보이는 점의 최대 개수. */
const MAX_DOTS = 6;
/** 현재 페이지가 머무는 풀사이즈 세 칸. */
const FIRST_CENTER_SLOT = 2;
const LAST_CENTER_SLOT = 4;

/** 크기 틀의 칸 번호로 점 크기를 정한다 — 끝으로 갈수록 작아진다. */
function slotSize(slot: number): DotSize {
  const fromEdge = Math.min(slot, SLOT_COUNT - 1 - slot);
  if (fromEdge >= 2) return 5;
  return fromEdge === 1 ? 4 : 3;
}

/**
 * 현재 페이지가 앉을 칸을 직전 위치에서 이어 계산한다.
 *
 * 한 장 넘기면 점 묶음은 그대로 있고 현재 페이지만 옆 칸으로 옮겨 앉는다. 풀사이즈 세 칸을
 * 벗어나려 할 때만 묶음이 한 칸 밀린다 — 인스타그램 인디케이터와 같은 동작이라, 같은 장이라도
 * 어느 쪽에서 왔는지에 따라 배치가 달라진다.
 */
function nextActiveSlot(previous: SlotAnchor, activeIndex: number) {
  const moved = previous.slot + (activeIndex - previous.index);
  return Math.min(Math.max(moved, FIRST_CENTER_SLOT), LAST_CENTER_SLOT);
}

/** 처음 그릴 때는 앞에서부터 넘겨 온 것으로 본다 — 첫 두 장은 왼쪽 칸이 덜 찬다. */
function initialAnchor(activeIndex: number): SlotAnchor {
  return {
    index: activeIndex,
    slot: Math.min(activeIndex + FIRST_CENTER_SLOT, LAST_CENTER_SLOT),
    forward: true,
  };
}

interface SlotAnchor {
  index: number;
  slot: number;
  forward: boolean;
}

/**
 * 보여줄 점과 그 크기를 고른다.
 *
 * 6장부터는 점을 다 늘어놓지 않고, 현재 페이지를 크기 틀의 `anchor.slot` 칸에 놓은 뒤 실제로
 * 존재하는 페이지만큼만 좌우로 잘라낸다. 그래서 작아진 끝 점이 곧 "그쪽에 아직 안 보이는
 * 페이지가 남았다" 는 표시가 된다 — 첫 장 근처면 오른쪽만, 끝 장 근처면 왼쪽만 작아진다.
 *
 * 가운데 구간은 7칸이 다 차는데 점은 6개까지만 두므로 한 칸을 버려야 한다. **넘어온 쪽** 끝을
 * 버려서 가려는 방향에 점을 더 남긴다 — 앞으로 넘길 때와 뒤로 넘길 때가 서로 거울처럼 된다.
 */
function visibleDots(count: number, activeIndex: number, anchor: SlotAnchor) {
  if (count <= FULL_DOTS_MAX) {
    return Array.from({ length: count }, (_, index) => ({ index, size: 5 as DotSize }));
  }

  const { slot, forward } = anchor;
  let first = Math.max(activeIndex - slot, 0);
  let last = Math.min(activeIndex + SLOT_COUNT - 1 - slot, count - 1);
  if (last - first + 1 > MAX_DOTS) {
    if (forward) first = last - MAX_DOTS + 1;
    else last = first + MAX_DOTS - 1;
  }

  return Array.from({ length: last - first + 1 }, (_, offset) => {
    const index = first + offset;
    return { index, size: slotSize(index - activeIndex + slot) };
  });
}

/**
 * 캐러셀의 현재 페이지를 나타내는 공통 인디케이터.
 * onIndexChange가 있으면 페이지를 직접 선택할 수 있는 버튼으로 렌더링한다.
 */
function CarouselIndicator({
  count,
  activeIndex,
  onIndexChange,
  getItemLabel = (index) => `${index + 1}번째 페이지 보기`,
  className,
  'aria-label': ariaLabel = '캐러셀 페이지 선택',
  ...props
}: CarouselIndicatorProps) {
  // 점 묶음의 위치는 "직전에 어디서 왔는지"에 달려 있어 렌더 사이에 기억해야 한다.
  // activeIndex 가 바뀐 그 렌더에서 바로 맞춰 두는 편이(React 의 파생 상태 갱신 패턴)
  // effect 로 한 프레임 늦게 따라가며 점이 튀는 것보다 낫다.
  const [anchor, setAnchor] = React.useState(() => initialAnchor(activeIndex));
  let current = anchor;
  if (anchor.index !== activeIndex) {
    current = {
      index: activeIndex,
      slot: nextActiveSlot(anchor, activeIndex),
      forward: activeIndex > anchor.index,
    };
    setAnchor(current);
  }

  if (count <= 1) return null;

  const dots = visibleDots(count, activeIndex, current);
  const dotClassName = (index: number, size: DotSize) =>
    cn(
      'shrink-0 transition-all',
      SIZE_CLASS[size],
      index === activeIndex ? 'bg-gray-100' : 'bg-gray-20',
    );

  if (!onIndexChange) {
    return (
      <div
        data-slot="carousel-indicator"
        aria-hidden="true"
        className={cn('flex items-center justify-center gap-1', className)}
        {...props}
      >
        {dots.map(({ index, size }) => (
          <span
            key={index}
            data-slot="carousel-indicator-dot"
            className={dotClassName(index, size)}
          />
        ))}
      </div>
    );
  }

  const selectRelativeIndex = (offset: number) => {
    onIndexChange(Math.min(Math.max(activeIndex + offset, 0), count - 1));
  };

  return (
    <nav
      data-slot="carousel-indicator"
      aria-label={ariaLabel}
      className={cn('flex items-center justify-center gap-1', className)}
      {...props}
    >
      {dots.map(({ index, size }) => (
        <button
          key={index}
          type="button"
          aria-label={getItemLabel(index)}
          aria-current={index === activeIndex ? 'true' : undefined}
          className={cn(
            'relative grid place-items-center p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100',
            'after:absolute after:-inset-y-[9px] after:-inset-x-[3px] after:content-[""]',
            SIZE_CLASS[size],
          )}
          onClick={() => onIndexChange(index)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') {
              event.preventDefault();
              selectRelativeIndex(-1);
            }
            if (event.key === 'ArrowRight') {
              event.preventDefault();
              selectRelativeIndex(1);
            }
          }}
        >
          <span
            data-slot="carousel-indicator-dot"
            aria-hidden="true"
            className={dotClassName(index, size)}
          />
        </button>
      ))}
    </nav>
  );
}

export { CarouselIndicator };
