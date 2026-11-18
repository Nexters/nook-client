import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/shared/toast';
import { FloatingPlaceCards } from './FloatingPlaceCards';

const fixture = vi.hoisted(() => ({ photos: ['/a.jpg', '/b.jpg'] }));

vi.mock('@/features/map/api/queries', async (original) => ({
  ...(await original<typeof import('@/features/map/api/queries')>()),
  usePlaceDetail: (id: number | null) => ({
    data:
      id === null
        ? undefined
        : {
            id,
            name: `장소 ${id}`,
            category: '카페',
            address: '서울 성동구 서울숲길',
            lat: 37.54,
            lng: 127.04,
            bookmarked: true,
            photos: fixture.photos,
            tags: ['조용한', '정갈한'],
            posts: [],
            postsTotal: 0,
          },
  }),
}));
afterEach(() => {
  fixture.photos = ['/a.jpg', '/b.jpg'];
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function renderCards(
  onActiveIndexChange = vi.fn(),
  onHeightChange = vi.fn(),
  onExpand = vi.fn(),
  compact = false,
) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ToastProvider>
        <MemoryRouter>
          <FloatingPlaceCards
            placeIds={[1, 2, 3]}
            activeIndex={0}
            onActiveIndexChange={onActiveIndexChange}
            onHeightChange={onHeightChange}
            onExpand={onExpand}
            compact={compact}
            onClose={() => {}}
            onSelectPlace={() => {}}
          />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

it('reports card height so the location button stays above the resized card', () => {
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(365);
  const onHeightChange = vi.fn();
  renderCards(vi.fn(), onHeightChange);
  expect(onHeightChange).toHaveBeenCalledWith(365);
});

it('keeps photo swipes inside the card and advances places only on the outer scroller', () => {
  vi.useFakeTimers();
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(351);
  const onActiveIndexChange = vi.fn();
  renderCards(onActiveIndexChange);
  const placeScroller = screen.getByRole('region', { name: '검색 결과 장소' });
  const photoScroller = placeScroller.querySelector('[data-slot="carousel"] > div');
  if (!photoScroller) throw new Error('Missing photo scroller');
  fireEvent.scroll(photoScroller, { target: { scrollLeft: 359 } });
  act(() => vi.advanceTimersByTime(120));
  expect(onActiveIndexChange).not.toHaveBeenCalled();
  fireEvent.scroll(placeScroller, { target: { scrollLeft: 355 } });
  act(() => vi.advanceTimersByTime(120));
  expect(onActiveIndexChange).toHaveBeenCalledWith(1);
});

it('tracks upward drag directly and expands on release while horizontal photo swipes stay local', () => {
  vi.stubGlobal('PointerEvent', MouseEvent);
  try {
    const onExpand = vi.fn();
    renderCards(vi.fn(), vi.fn(), onExpand);
    const handle = screen.getAllByRole('button', { name: '장소 상세 전체 화면으로 확장' })[0];
    if (!handle) throw new Error('Missing handle');
    const card = handle.closest('section');
    if (!card) throw new Error('Missing card');
    fireEvent.pointerDown(handle, { button: 0, clientX: 100, clientY: 500 });
    fireEvent.pointerMove(card, { clientX: 102, clientY: 440 });
    expect(card.style.transform).toBe('translate3d(0, -60px, 0)');
    fireEvent.pointerUp(card, { clientX: 102, clientY: 440 });
    expect(onExpand).toHaveBeenCalledTimes(1);
    const photo = card.querySelector('[data-slot="carousel"] button');
    if (!photo) throw new Error('Missing photo');
    fireEvent.pointerDown(photo, { button: 0, clientX: 100, clientY: 500 });
    fireEvent.pointerMove(card, { clientX: 180, clientY: 495 });
    fireEvent.pointerUp(card, { clientX: 180, clientY: 495 });
    expect(onExpand).toHaveBeenCalledTimes(1);
    expect(card.style.transform).toBe('');
  } finally {
    vi.unstubAllGlobals();
  }
});

it('also expands when dragging a single photo rather than its handle', () => {
  vi.stubGlobal('PointerEvent', MouseEvent);
  fixture.photos = ['/single.jpg'];
  try {
    const onExpand = vi.fn();
    renderCards(vi.fn(), vi.fn(), onExpand);
    const photo = screen
      .getByRole('region', { name: '검색 결과 장소' })
      .querySelector('img[src="/single.jpg"]')
      ?.closest('button');
    const card = photo?.closest('section');
    if (!photo || !card) throw new Error('Missing single photo');
    fireEvent.pointerDown(photo, { button: 0, clientX: 100, clientY: 500 });
    fireEvent.pointerMove(card, { clientX: 102, clientY: 430 });
    fireEvent.pointerUp(card, { clientX: 102, clientY: 430 });
    expect(onExpand).toHaveBeenCalledTimes(1);
  } finally {
    vi.unstubAllGlobals();
  }
});

it('collapsed cards keep place information and actions but hide photos and indicators', () => {
  renderCards(vi.fn(), vi.fn(), vi.fn(), true);
  expect(screen.getByText('장소 1')).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: '주소 복사' }).length).toBeGreaterThan(0);
  expect(
    screen
      .getByRole('region', { name: '검색 결과 장소' })
      .querySelector('[data-slot="place-photos"]'),
  ).toBeNull();
  expect(screen.queryByText('1/2')).not.toBeInTheDocument();
});

it('derives card depth from live scroll and flattens the incoming card at its snap', () => {
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(351);
  renderCards();
  const scroller = screen.getByRole('region', { name: '검색 결과 장소' });
  const surfaces = scroller.querySelectorAll<HTMLElement>('[data-place-card-surface]');
  expect(surfaces[0]?.style.transform).toContain('rotateY(0deg) scale(1)');
  fireEvent.scroll(scroller, { target: { scrollLeft: 177.5 } });
  expect(surfaces[0]?.style.transform).toContain('rotateY(7deg)');
  expect(surfaces[1]?.style.transform).toContain('rotateY(-7deg)');
  fireEvent.scroll(scroller, { target: { scrollLeft: 355 } });
  expect(surfaces[1]?.style.transform).toContain('rotateY(0deg) scale(1)');
});

it('keeps the last card flat at the right-aligned end of the scroller', () => {
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(351);
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(1077);
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(375);
  renderCards();
  const scroller = screen.getByRole('region', { name: '검색 결과 장소' });
  fireEvent.scroll(scroller, { target: { scrollLeft: 702 } });
  const surfaces = scroller.querySelectorAll<HTMLElement>('[data-place-card-surface]');
  expect(surfaces[2]?.style.transform).toContain('rotateY(0deg) scale(1)');
  expect(surfaces[2]).toHaveClass('touch-pan-x');
});

it('keeps scrolling but removes decorative depth for reduced motion', () => {
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(351);
  vi.spyOn(window, 'matchMedia').mockReturnValue({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as unknown as MediaQueryList);
  renderCards();
  const scroller = screen.getByRole('region', { name: '검색 결과 장소' });
  fireEvent.scroll(scroller, { target: { scrollLeft: 177.5 } });
  for (const surface of scroller.querySelectorAll<HTMLElement>('[data-place-card-surface]')) {
    expect(surface.style.transform).toBe('');
  }
});

it('anchors neighboring card depth to the exposed edge so its peek stays visible', () => {
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(351);
  renderCards();
  const scroller = screen.getByRole('region', { name: '검색 결과 장소' });
  const surfaces = scroller.querySelectorAll<HTMLElement>('[data-place-card-surface]');
  expect(surfaces[1]?.style.transformOrigin).toBe('left bottom');
  fireEvent.scroll(scroller, { target: { scrollLeft: 177.5 } });
  expect(surfaces[0]?.style.transformOrigin).toBe('right bottom');
  expect(surfaces[1]?.style.transformOrigin).toBe('left bottom');
  fireEvent.scroll(scroller, { target: { scrollLeft: 355 } });
  expect(surfaces[1]?.style.transformOrigin).toBe('center bottom');
});
