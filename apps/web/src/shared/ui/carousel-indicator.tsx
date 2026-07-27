import type * as React from 'react';
import { cn } from '@/shared/lib/utils';

export interface CarouselIndicatorProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'onChange'> {
  count: number;
  activeIndex: number;
  size?: 'sm' | 'md';
  onIndexChange?: (index: number) => void;
  getItemLabel?: (index: number) => string;
}

/**
 * 캐러셀의 현재 페이지를 나타내는 공통 인디케이터.
 * onIndexChange가 있으면 페이지를 직접 선택할 수 있는 버튼으로 렌더링한다.
 */
function CarouselIndicator({
  count,
  activeIndex,
  size = 'sm',
  onIndexChange,
  getItemLabel = (index) => `${index + 1}번째 페이지 보기`,
  className,
  'aria-label': ariaLabel = '캐러셀 페이지 선택',
  ...props
}: CarouselIndicatorProps) {
  if (count <= 1) return null;

  const indexes = Array.from({ length: count }, (_, index) => index);
  const dotClassName = (index: number) =>
    cn(
      'shrink-0 transition-colors',
      size === 'sm' ? 'size-1' : 'size-1.5',
      index === activeIndex
        ? size === 'sm'
          ? 'bg-gray-100'
          : 'bg-gray-80'
        : size === 'sm'
          ? 'bg-gray-30'
          : 'bg-gray-20',
    );

  if (!onIndexChange) {
    return (
      <div
        data-slot="carousel-indicator"
        aria-hidden="true"
        className={cn(
          'flex items-center justify-center',
          size === 'sm' ? 'gap-1' : 'gap-1.5',
          className,
        )}
        {...props}
      >
        {indexes.map((index) => (
          <span key={index} data-slot="carousel-indicator-dot" className={dotClassName(index)} />
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
      className={cn(
        'flex items-center justify-center',
        size === 'sm' ? 'gap-1' : 'gap-1.5',
        className,
      )}
      {...props}
    >
      {indexes.map((index) => (
        <button
          key={index}
          type="button"
          aria-label={getItemLabel(index)}
          aria-current={index === activeIndex ? 'true' : undefined}
          className={cn(
            'relative grid place-items-center p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100',
            'after:absolute after:-inset-y-[9px] after:-inset-x-[3px] after:content-[""]',
            size === 'sm' ? 'size-1' : 'size-1.5',
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
            className={dotClassName(index)}
          />
        </button>
      ))}
    </nav>
  );
}

export { CarouselIndicator };
