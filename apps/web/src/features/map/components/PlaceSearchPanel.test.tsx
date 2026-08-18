import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SavedPlaceSearchPage } from '@/features/map/types';
import { PlaceSearchPanel } from './PlaceSearchPanel';

// HTTP 전송이 아니라 배선만 검증한다 — feature api 모듈 단위로 모킹하는 컨벤션.
// queries.ts 가 같은 모듈에서 다른 fetch 들도 가져오므로 함께 vi.fn 으로 채운다.
const mocks = vi.hoisted(() => ({
  disconnectPostPlace: vi.fn(),
  fetchMapPins: vi.fn(),
  fetchPlaceDetail: vi.fn(),
  fetchRecentPlaces: vi.fn(),
  fetchSavedPlaceSearch: vi.fn(),
  updatePlaceBookmark: vi.fn(),
  updatePlaceMemo: vi.fn(),
}));
vi.mock('@/features/map/api', () => mocks);

const PAGE: SavedPlaceSearchPage = {
  items: [{ id: 11, name: '하우스 오브 와일드', category: '카페', region: '서울' }],
  totalCount: 1,
};

function renderPanel(props: Partial<React.ComponentProps<typeof PlaceSearchPanel>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PlaceSearchPanel canScroll onExit={() => {}} onSelectPlace={() => {}} {...props} />
    </QueryClientProvider>,
  );
}

function typeQuery(value: string) {
  fireEvent.change(screen.getByPlaceholderText('장소명을 입력해주세요'), {
    target: { value },
  });
}

describe('PlaceSearchPanel', () => {
  beforeEach(() => {
    mocks.fetchSavedPlaceSearch.mockReset().mockResolvedValue(PAGE);
  });

  it('검색 전(빈 검색어)에는 건수를 보여주지 않고 API 도 부르지 않는다', () => {
    renderPanel();

    expect(screen.queryByText('건')).not.toBeInTheDocument();
    expect(mocks.fetchSavedPlaceSearch).not.toHaveBeenCalled();
  });

  it('검색어를 입력하면 디바운스 뒤 검색 API 를 부르고 장소 카드와 건수가 보인다', async () => {
    renderPanel();

    typeQuery('하우스');
    // 디바운스 — 타이핑 직후에는 아직 부르지 않는다.
    expect(mocks.fetchSavedPlaceSearch).not.toHaveBeenCalled();

    expect(await screen.findByText('하우스 오브 와일드')).toBeInTheDocument();
    expect(mocks.fetchSavedPlaceSearch).toHaveBeenCalledWith('하우스');
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('건')).toBeInTheDocument();
  });

  it('건수는 목록 길이가 아니라 서버 전체 건수를 보여준다', async () => {
    mocks.fetchSavedPlaceSearch.mockResolvedValue({ ...PAGE, totalCount: 120 });
    renderPanel();

    typeQuery('하우스');

    expect(await screen.findByText('120')).toBeInTheDocument();
  });

  it('일치하는 장소가 없으면 빈 상태 문구를 보여준다', async () => {
    mocks.fetchSavedPlaceSearch.mockResolvedValue({ items: [], totalCount: 0 });
    renderPanel();

    typeQuery('존재하지않는장소이름');

    expect(await screen.findByText('아직 저장한 공간이 없어요')).toBeInTheDocument();
  });

  it('아카이브 칩 필터는 서버 미지원이라 그리지 않는다', async () => {
    renderPanel();

    typeQuery('하우스');
    await screen.findByText('하우스 오브 와일드');

    expect(screen.queryByRole('button', { name: '전체' })).not.toBeInTheDocument();
  });

  it('뒤로가기를 누르면 onExit 을 호출한다', () => {
    const onExit = vi.fn();
    renderPanel({ onExit });

    fireEvent.click(screen.getByRole('button', { name: '검색 닫기' }));

    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('결과 카드를 누르면 장소 id 로 onSelectPlace 를 호출한다', async () => {
    const onSelectPlace = vi.fn();
    renderPanel({ onSelectPlace });

    typeQuery('하우스');
    fireEvent.click(await screen.findByRole('button', { name: /하우스 오브 와일드/ }));

    expect(onSelectPlace).toHaveBeenCalledWith(11);
  });
});
