import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CarouselIndicator } from '@/shared/ui/carousel-indicator';

/**
 * 점을 `크기(px)` 나열로 읽는다. 현재 페이지는 대괄호로 감싼다 — 시안 캡처와
 * 눈으로 맞춰볼 수 있게 "3 4 5 5 [5] 4" 같은 한 줄로 만든다.
 */
function readDots(container: HTMLElement) {
  return Array.from(container.querySelectorAll('[data-slot="carousel-indicator-dot"]'))
    .map((dot) => {
      const size = dot.className.match(/size-\[(\d)px\]/)?.[1] ?? '?';
      return dot.className.includes('bg-gray-100') ? `[${size}]` : size;
    })
    .join(' ');
}

function renderDots(count: number, activeIndex: number) {
  const { container } = render(<CarouselIndicator count={count} activeIndex={activeIndex} />);
  return readDots(container);
}

/** 한 번 붙여 둔 인디케이터를 페이지 순서대로 넘기며 배치를 모은다(방향에 따라 달라진다). */
function walkDots(count: number, path: number[]) {
  const [start = 0, ...rest] = path;
  const { container, rerender } = render(<CarouselIndicator count={count} activeIndex={start} />);
  const seen = [readDots(container)];
  for (const index of rest) {
    rerender(<CarouselIndicator count={count} activeIndex={index} />);
    seen.push(readDots(container));
  }
  return seen;
}

describe('CarouselIndicator', () => {
  it('페이지가 하나면 렌더링하지 않는다', () => {
    const { container } = render(<CarouselIndicator count={1} activeIndex={0} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('5장 이하는 전부 Default 크기로 늘어놓는다', () => {
    expect(renderDots(5, 0)).toBe('[5] 5 5 5 5');
    expect(renderDots(5, 4)).toBe('5 5 5 5 [5]');
  });

  // 시안(20장) 캡처에서 그대로 옮긴 표. 여기가 틀어지면 구현이 시안에서 벗어난 것이다.
  it.each([
    [0, '[5] 5 5 4 3'],
    [2, '5 5 [5] 4 3'],
    [3, '4 5 5 [5] 4 3'],
    [18, '3 4 5 5 [5] 4'],
    [19, '3 4 5 5 [5]'],
  ])('20장에서 %i번째 페이지의 점 배치가 시안과 같다', (activeIndex, expected) => {
    expect(renderDots(20, activeIndex)).toBe(expected);
  });

  it.each([6, 7, 12, 20])(
    '%i장에서도 점이 6개를 넘지 않고 현재 페이지는 항상 Default 다',
    (count) => {
      const forward = Array.from({ length: count }, (_, index) => index);
      const roundTrip = [...forward, ...forward.slice(0, -1).reverse()];

      for (const dots of walkDots(count, roundTrip)) {
        expect(dots.split(' ').length).toBeLessThanOrEqual(6);
        expect(dots).toContain('[5]');
      }
    },
  );

  it('숨은 페이지가 있는 쪽 끝점만 작아진다', () => {
    // 첫 장 — 뒤로 갈 페이지만 남았으니 오른쪽만 줄어든다.
    expect(renderDots(20, 0)).toBe('[5] 5 5 4 3');
    // 마지막 장 — 반대로 왼쪽만 줄어든다.
    expect(renderDots(20, 19)).toBe('3 4 5 5 [5]');
    // 가운데 — 양쪽 모두 숨어 있다. 6개 안에 다 담을 수 없어 넘어온 왼쪽을 한 칸 버린다.
    expect(renderDots(20, 10)).toBe('4 5 5 [5] 4 3');
  });

  // 인스타그램 인디케이터와 같은 동작 — 풀사이즈 세 칸 안에서는 묶음이 멈춰 있다.
  it('앞으로 넘기면 세 칸을 다 쓴 뒤에야 점 묶음이 밀린다', () => {
    expect(walkDots(20, [0, 1, 2, 3, 4])).toEqual([
      '[5] 5 5 4 3',
      '5 [5] 5 4 3',
      '5 5 [5] 4 3',
      '4 5 5 [5] 4 3',
      '4 5 5 [5] 4 3',
    ]);
  });

  it('뒤로 넘기면 묶음이 멈춘 채 현재 점만 반대쪽 끝까지 걸어간다', () => {
    expect(walkDots(20, [19, 18, 17, 16, 15])).toEqual([
      '3 4 5 5 [5]',
      '3 4 5 [5] 5',
      '3 4 [5] 5 5',
      '3 4 [5] 5 5 4',
      '3 4 [5] 5 5 4',
    ]);
  });

  // 세 칸을 다 건너온 뒤(정착 상태)에는 앞/뒤가 서로 거울처럼 뒤집힌 모양이 된다.
  it('같은 장이라도 어느 쪽에서 왔는지에 따라 배치가 갈린다', () => {
    const forward = walkDots(20, [8, 9, 10]).at(-1);
    const backward = walkDots(20, [12, 11, 10]).at(-1);

    expect(forward).toBe('4 5 5 [5] 4 3');
    expect(backward).toBe('3 4 [5] 5 5 4');
  });

  it('콜백이 없으면 표시 전용 점을 렌더링한다', () => {
    const { container } = render(<CarouselIndicator count={3} activeIndex={1} />);

    expect(container.querySelectorAll('[data-slot="carousel-indicator-dot"]')).toHaveLength(3);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('페이지 선택을 외부 상태로 전달한다', () => {
    const onIndexChange = vi.fn();
    render(<CarouselIndicator count={3} activeIndex={0} onIndexChange={onIndexChange} />);

    fireEvent.click(screen.getByRole('button', { name: '2번째 페이지 보기' }));

    expect(onIndexChange).toHaveBeenCalledWith(1);
  });

  it('좌우 화살표 키로 앞뒤 페이지를 고른다', () => {
    const onIndexChange = vi.fn();
    render(<CarouselIndicator count={3} activeIndex={1} onIndexChange={onIndexChange} />);
    const dot = screen.getByRole('button', { name: '2번째 페이지 보기' });

    fireEvent.keyDown(dot, { key: 'ArrowRight' });
    expect(onIndexChange).toHaveBeenLastCalledWith(2);

    fireEvent.keyDown(dot, { key: 'ArrowLeft' });
    expect(onIndexChange).toHaveBeenLastCalledWith(0);
  });
});
