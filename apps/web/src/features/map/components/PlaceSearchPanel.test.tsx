import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react';
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
      <PlaceSearchPanel
        canScroll
        onExit={() => {}}
        onSelectPlace={() => {}}
        onInputFocus={() => {}}
        onInputBlur={() => {}}
        {...props}
      />
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

  it('검색 전(빈 검색어)에는 결과 영역을 그리지 않고 API 도 부르지 않는다', () => {
    renderPanel();

    expect(screen.queryByText('아직 저장한 공간이 없어요')).not.toBeInTheDocument();
    expect(mocks.fetchSavedPlaceSearch).not.toHaveBeenCalled();
  });

  it('검색어를 입력하면 디바운스 뒤 검색 API 를 부르고 장소 카드가 보인다 — 칩·건수는 없다', async () => {
    renderPanel();

    typeQuery('하우스');
    // 디바운스 — 타이핑 직후에는 아직 부르지 않는다.
    expect(mocks.fetchSavedPlaceSearch).not.toHaveBeenCalled();

    expect(await screen.findByText('하우스 오브 와일드')).toBeInTheDocument();
    expect(mocks.fetchSavedPlaceSearch).toHaveBeenCalledWith('하우스', null);
    // 개수·아카이브 필터는 목록 헤더에만 둔다(QA).
    expect(screen.queryByText('건')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '전체' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '성수 카페' })).not.toBeInTheDocument();
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

  it('시트가 준 하단 패딩을 스크롤 영역에 적용한다 — full 이 아닌 스냅에서도 맨 아래 장소까지 닿게', async () => {
    const { container } = renderPanel({ scrollPaddingBottom: '55dvh' });

    typeQuery('하우스');
    await screen.findByText('하우스 오브 와일드');

    const scroller = container.querySelector('.overflow-y-auto');
    expect(scroller).toHaveStyle({ paddingBottom: '55dvh' });
  });

  it('자동 포커스는 슬라이드 전환이 끝난 뒤 preventScroll 로 준다 — 전환 중(translate 상태) 포커스는 iOS Safari 가 뷰포트를 옆으로 팬해 화면이 밀린 채 남는다', () => {
    vi.useFakeTimers();
    const focusSpy = vi.spyOn(HTMLInputElement.prototype, 'focus');
    try {
      renderPanel();

      expect(focusSpy).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    } finally {
      focusSpy.mockRestore();
      vi.useRealTimers();
    }
  });

  it('뒤로가기를 누르면 onExit 을 호출한다', () => {
    const onExit = vi.fn();
    renderPanel({ onExit });

    fireEvent.click(screen.getByRole('button', { name: '검색 닫기' }));

    expect(onExit).toHaveBeenCalledTimes(1);
  });

  // 결과 블록은 검색어가 있어야 렌더되므로, 결과 영역에만 핸들러를 걸면 "검색에 막 들어와
  // 아직 아무것도 안 친" 상태 — 정작 키보드가 떠 있는 그 상태 — 에서 포커스가 안 풀린다.
  it('검색 결과가 아직 없어도 필드 밖을 누르면 입력 포커스가 풀린다', () => {
    const onInputBlur = vi.fn();
    const { container } = renderPanel({ onInputBlur });
    const input = screen.getByPlaceholderText('장소명을 입력해주세요');
    input.focus();

    fireEvent.pointerDown(container.firstChild as Element);

    expect(document.activeElement).not.toBe(input);
    expect(onInputBlur).toHaveBeenCalled();
  });

  it('검색 필드 안을 누를 때는 포커스를 유지한다', () => {
    const onInputBlur = vi.fn();
    renderPanel({ onInputBlur });
    const input = screen.getByPlaceholderText('장소명을 입력해주세요');
    input.focus();

    fireEvent.pointerDown(input);

    expect(document.activeElement).toBe(input);
    expect(onInputBlur).not.toHaveBeenCalled();
  });

  it('결과 카드를 누르면 장소 id 로 onSelectPlace 를 호출한다', async () => {
    const onSelectPlace = vi.fn();
    renderPanel({ onSelectPlace });

    typeQuery('하우스');
    fireEvent.click(await screen.findByRole('button', { name: /하우스 오브 와일드/ }));

    expect(onSelectPlace).toHaveBeenCalledWith(11);
  });
});
