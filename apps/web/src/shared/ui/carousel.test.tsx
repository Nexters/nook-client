import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Carousel } from './carousel';

/**
 * jsdom 은 레이아웃을 계산하지 않아 `offsetWidth` 가 항상 0 이다 — 캐러셀은 그 값으로
 * 한 칸(폭 + gap)을 재므로 슬라이드에 실제 폭이 있는 것처럼 심어준다.
 */
const SLIDE_WIDTH = 100;
const GAP = 8;

function renderCarousel(onActiveIndexChange: (index: number) => void) {
  const { container } = render(
    <Carousel gap={GAP} onActiveIndexChange={onActiveIndexChange}>
      {['a', 'b', 'c'].map((id) => (
        <div key={id} data-testid={`slide-${id}`}>
          {id}
        </div>
      ))}
    </Carousel>,
  );

  const scroller = screen.getByTestId('slide-a').parentElement as HTMLElement;
  Object.defineProperty(scroller.firstElementChild, 'offsetWidth', {
    value: SLIDE_WIDTH,
    configurable: true,
  });
  return { scroller, container };
}

/** 스크롤 위치를 옮기고 브라우저가 보내는 것과 같은 scroll 이벤트를 흘린다. */
function scrollTo(scroller: HTMLElement, left: number) {
  scroller.scrollLeft = left;
  fireEvent.scroll(scroller);
}

describe('Carousel 인디케이터', () => {
  it('기본값은 하단 점을 노출한다', () => {
    const { container } = renderCarousel(vi.fn());

    expect(container.querySelectorAll('[data-slot="carousel-indicator-dot"]')).toHaveLength(3);
  });

  // 여러 장이 동시에 보이는 캐러셀(PostImages 등)은 점이 현재 위치를 가리키지 못해 끈다.
  it('indicator=false 면 점을 렌더링하지 않는다', () => {
    const { container } = render(
      <Carousel indicator={false}>
        {['a', 'b', 'c'].map((id) => (
          <div key={id}>{id}</div>
        ))}
      </Carousel>,
    );

    expect(container.querySelector('[data-slot="carousel-indicator"]')).toBeNull();
  });
});

describe('Carousel onActiveIndexChange', () => {
  it('슬라이드가 바뀔 때마다 현재 인덱스를 알린다', () => {
    const onActiveIndexChange = vi.fn();
    const { scroller } = renderCarousel(onActiveIndexChange);

    scrollTo(scroller, SLIDE_WIDTH + GAP);
    expect(onActiveIndexChange).toHaveBeenLastCalledWith(1);

    scrollTo(scroller, (SLIDE_WIDTH + GAP) * 2);
    expect(onActiveIndexChange).toHaveBeenLastCalledWith(2);
  });

  it('같은 칸 안에서 스크롤이 이어지는 동안에는 다시 알리지 않는다', () => {
    const onActiveIndexChange = vi.fn();
    const { scroller } = renderCarousel(onActiveIndexChange);

    // 한 칸을 넘기는 동안 scroll 이벤트는 수십 번 오지만 인덱스는 스냅 단위로만 바뀐다.
    scrollTo(scroller, SLIDE_WIDTH + GAP);
    scrollTo(scroller, SLIDE_WIDTH + GAP + 4);
    scrollTo(scroller, SLIDE_WIDTH + GAP - 4);

    expect(onActiveIndexChange).toHaveBeenCalledTimes(1);
  });

  it('마지막 칸을 넘어서는 스크롤(바운스)에도 인덱스가 범위를 벗어나지 않는다', () => {
    const onActiveIndexChange = vi.fn();
    const { scroller } = renderCarousel(onActiveIndexChange);

    scrollTo(scroller, (SLIDE_WIDTH + GAP) * 10);
    expect(onActiveIndexChange).toHaveBeenLastCalledWith(2);
  });
});
