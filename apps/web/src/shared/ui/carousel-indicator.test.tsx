import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CarouselIndicator } from '@/shared/ui/carousel-indicator';

describe('CarouselIndicator', () => {
  it('페이지 선택을 외부 상태로 전달한다', () => {
    const onIndexChange = vi.fn();
    render(<CarouselIndicator count={3} activeIndex={0} onIndexChange={onIndexChange} size="md" />);

    fireEvent.click(screen.getByRole('button', { name: '2번째 페이지 보기' }));

    expect(onIndexChange).toHaveBeenCalledWith(1);
  });

  it('콜백이 없으면 표시 전용 점을 렌더링한다', () => {
    const { container } = render(<CarouselIndicator count={3} activeIndex={1} />);

    expect(container.querySelectorAll('[data-slot="carousel-indicator-dot"]')).toHaveLength(3);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('페이지가 하나면 렌더링하지 않는다', () => {
    const { container } = render(<CarouselIndicator count={1} activeIndex={0} />);

    expect(container).toBeEmptyDOMElement();
  });
});
