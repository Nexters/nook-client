import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  fetchSharedPlaceDetail: vi.fn(),
  updatePlaceBookmark: vi.fn(),
  updatePlaceMemo: vi.fn(),
}));
vi.mock('@/features/map/api', () => mocks);

const PAGE: SavedPlaceSearchPage = {
  items: [
    {
      id: 11,
      name: '하우스 오브 와일드',
      category: '카페',
      region: '서울',
      thumbnail: 'https://img.example/haus.jpg',
    },
    { id: 12, name: '성수 세터커피', category: '카페', region: '서울' },
  ],
  groups: [
    { id: 3, name: '성수 카페', color: 'sky' },
    { id: 4, name: '주말 나들이', color: 'yellow' },
  ],
  totalCount: 2,
};

/** groupId=3 필터가 걸린 응답 — 그룹 목록은 필터와 무관하게 검색어 기준 그대로 온다. */
const FILTERED_PAGE: SavedPlaceSearchPage = {
  ...PAGE,
  items: PAGE.items.slice(0, 1),
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
    mocks.fetchSavedPlaceSearch
      .mockReset()
      .mockImplementation((_query: string, groupId: number | null) =>
        Promise.resolve(groupId === null ? PAGE : FILTERED_PAGE),
      );
  });

  it('검색 전(빈 검색어)에는 칩·건수를 보여주지 않고 API 도 부르지 않는다', () => {
    renderPanel();

    expect(screen.queryByRole('button', { name: '전체' })).not.toBeInTheDocument();
    expect(screen.queryByText('건')).not.toBeInTheDocument();
    expect(mocks.fetchSavedPlaceSearch).not.toHaveBeenCalled();
  });

  it('검색어를 입력하면 디바운스 뒤 검색 API 를 부르고 장소 카드와 건수가 보인다', async () => {
    renderPanel();

    typeQuery('하우스');
    // 디바운스 — 타이핑 직후에는 아직 부르지 않는다.
    expect(mocks.fetchSavedPlaceSearch).not.toHaveBeenCalled();

    expect(await screen.findByText('하우스 오브 와일드')).toBeInTheDocument();
    expect(mocks.fetchSavedPlaceSearch).toHaveBeenCalledWith('하우스', null);
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('건')).toBeInTheDocument();
  });

  it('건수는 목록 길이가 아니라 서버 전체 건수를 보여준다', async () => {
    mocks.fetchSavedPlaceSearch.mockResolvedValue({ ...PAGE, totalCount: 120 });
    renderPanel();

    typeQuery('하우스');

    expect(await screen.findByText('120')).toBeInTheDocument();
  });

  it('결과 카드에 서버 썸네일을 그린다', async () => {
    const { container } = renderPanel();

    typeQuery('하우스');
    await screen.findByText('하우스 오브 와일드');

    expect(container.querySelector('img[src="https://img.example/haus.jpg"]')).toBeInTheDocument();
  });

  it('일치하는 장소가 없으면 빈 상태 문구를 보여준다', async () => {
    mocks.fetchSavedPlaceSearch.mockResolvedValue({ items: [], groups: [], totalCount: 0 });
    renderPanel();

    typeQuery('존재하지않는장소이름');

    expect(await screen.findByText('아직 저장한 공간이 없어요')).toBeInTheDocument();
  });

  it('응답의 그룹 목록으로 칩을 그린다', async () => {
    renderPanel();

    typeQuery('하우스');
    await screen.findByText('하우스 오브 와일드');

    expect(screen.getByRole('button', { name: '전체' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '성수 카페' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '주말 나들이' })).toBeInTheDocument();
  });

  it('그룹 칩을 누르면 그 그룹으로 필터된 결과만 남고, 칩 목록은 그대로다', async () => {
    renderPanel();

    typeQuery('하우스');
    expect(await screen.findByText('성수 세터커피')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '성수 카페' }));

    // keepPreviousData 로 직전 결과가 잠깐 유지되므로, 필터된 새 결과가 반영될 때까지 기다린다.
    await waitFor(() => {
      expect(screen.queryByText('성수 세터커피')).not.toBeInTheDocument();
    });
    expect(mocks.fetchSavedPlaceSearch).toHaveBeenCalledWith('하우스', 3);
    expect(screen.getByText('하우스 오브 와일드')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    // 칩 목록은 필터 없는 응답 기준 — 필터를 걸어도 다른 칩이 사라지지 않는다.
    expect(screen.getByRole('button', { name: '주말 나들이' })).toBeInTheDocument();
  });

  it('전체 칩을 누르면 필터를 푼다', async () => {
    renderPanel();

    typeQuery('하우스');
    await screen.findByText('성수 세터커피');

    fireEvent.click(screen.getByRole('button', { name: '성수 카페' }));
    await waitFor(() => {
      expect(screen.queryByText('성수 세터커피')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '전체' }));
    expect(await screen.findByText('성수 세터커피')).toBeInTheDocument();
  });

  it('검색어를 바꾸면 그룹 필터가 풀린다 — 지난 검색어의 필터가 새 결과에 남지 않는다', async () => {
    renderPanel();

    typeQuery('하우스');
    await screen.findByText('성수 세터커피');
    fireEvent.click(screen.getByRole('button', { name: '성수 카페' }));
    await waitFor(() => {
      expect(screen.queryByText('성수 세터커피')).not.toBeInTheDocument();
    });

    typeQuery('성수');

    // 새 검색어는 필터 없이 조회하고, 지난 필터(groupId 3)로는 다시 부르지 않는다.
    await waitFor(() => {
      expect(mocks.fetchSavedPlaceSearch).toHaveBeenCalledWith('성수', null);
    });
    expect(mocks.fetchSavedPlaceSearch).not.toHaveBeenCalledWith('성수', 3);
    expect(await screen.findByText('성수 세터커피')).toBeInTheDocument();
  });

  it('시트가 준 하단 패딩을 스크롤 영역에 적용한다 — full 이 아닌 스냅에서도 맨 아래 장소까지 닿게', async () => {
    const { container } = renderPanel({ scrollPaddingBottom: '55dvh' });

    typeQuery('하우스');
    await screen.findByText('하우스 오브 와일드');

    const scroller = container.querySelector('.overflow-y-auto');
    expect(scroller).toHaveStyle({ paddingBottom: '55dvh' });
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
