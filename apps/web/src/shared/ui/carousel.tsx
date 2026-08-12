import * as React from 'react';
import { cn } from '@/shared/lib/utils';
import { CarouselIndicator } from '@/shared/ui/carousel-indicator';

/**
 * Figma `Tabloid - 4 > 캐러셀` 기준.
 * 가로 스크롤 + 하단 인디케이터. 스크롤·스냅은 브라우저 네이티브(scroll-snap)가 처리하므로
 * 캐러셀 라이브러리를 쓰지 않는다 — 터치 관성도 WebView 기본 동작을 그대로 탄다.
 *
 * 슬라이드 크기는 사용처가 정한다(시안은 240x300). 여기선 스크롤 컨테이너와
 * 스냅 정렬, 현재 인덱스 점만 소유한다.
 */
export interface CarouselProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 슬라이드 사이 간격(px). 인디케이터 인덱스 계산에도 쓰이므로 시안 기본값 8 을 유지한다. */
  gap?: number;
  /**
   * 하단 점 인디케이터. 시안 `캐러셀`은 있고 `저장된 게시물`의 이미지 줄은 없어서 옵션이다.
   * (슬라이드가 1개면 값과 무관하게 렌더하지 않는다.)
   */
  indicator?: boolean;
  /**
   * false 면 스냅 기준점의 좌측 16px 여백을 없앤다 — 슬라이드가 화면 폭을 꽉 채우는
   * 전체화면 이미지 뷰어처럼 좌우 여백이 없는 경우에만 쓴다.
   */
  padded?: boolean;
  /**
   * 처음 보여줄 슬라이드 위치. 마운트 시 한 번만 반영한다 — 그리드에서 고른 사진으로
   * 확대뷰를 여는 것처럼 "몇 번째부터 시작할지"를 사용처가 정하는 경우에만 쓴다.
   */
  initialIndex?: number;
  /**
   * 현재 슬라이드가 바뀔 때 호출된다. 캐러셀 밖에 고정해 둔 표시(사진 카운터 `2/6` 등)를
   * 따라오게 할 때 쓴다 — 그런 표시는 슬라이드와 함께 넘어가면 안 되므로 인덱스만 빌려준다.
   */
  onActiveIndexChange?: (index: number) => void;
}

function Carousel({
  children,
  gap = 8,
  indicator = true,
  padded = true,
  initialIndex = 0,
  onActiveIndexChange,
  className,
  ...props
}: CarouselProps) {
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const [active, setActive] = React.useState(initialIndex);
  const count = React.Children.count(children);

  // 마운트 직후 한 번만 시작 위치로 점프한다(애니메이션 없이 — 이미 그 사진을 누른 상태다).
  // biome-ignore lint/correctness/useExhaustiveDependencies: 시작 위치는 마운트 시점 값만 쓴다
  React.useEffect(() => {
    const scroller = scrollerRef.current;
    const first = scroller?.firstElementChild;
    if (!scroller || !(first instanceof HTMLElement) || initialIndex === 0) return;
    scroller.scrollLeft = (first.offsetWidth + gap) * initialIndex;
  }, []);

  const handleScroll = () => {
    const scroller = scrollerRef.current;
    const first = scroller?.firstElementChild;
    if (!scroller || !(first instanceof HTMLElement)) return;
    // 슬라이드 폭이 모두 같다는 전제(시안 240px 고정). 한 칸 = 폭 + gap.
    const step = first.offsetWidth + gap;
    if (step <= 0) return;
    // 스크롤 이벤트는 한 칸을 넘기는 동안에도 수십 번 오지만 인덱스는 스냅 단위로만
    // 바뀐다 — 실제로 달라졌을 때만 상태를 건드리고 밖에 알린다.
    const next = Math.min(Math.max(Math.round(scroller.scrollLeft / step), 0), count - 1);
    if (next === active) return;
    setActive(next);
    onActiveIndexChange?.(next);
  };

  return (
    <div data-slot="carousel" className={cn('w-full bg-gray-0', className)} {...props}>
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        style={{ gap }}
        className={cn(
          // 좌우 16px 여백. scroll-pl-4 가 없으면 스냅이 패딩을 무시해서 두 번째 카드부터
          // 왼쪽 벽에 붙는다 — 첫 카드와 같은 16px 을 유지시킨다.
          'flex snap-x snap-mandatory overflow-x-auto',
          padded && 'scroll-pl-4',
          '[&>*]:shrink-0 [&>*]:snap-start',
          // 네이티브 스크롤바는 모바일 문맥에서 불필요하다.
          '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        )}
      >
        {children}
      </div>

      {indicator ? <CarouselIndicator count={count} activeIndex={active} className="py-3" /> : null}
    </div>
  );
}

export { Carousel };
