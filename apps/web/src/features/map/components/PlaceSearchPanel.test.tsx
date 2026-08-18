import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Archive } from '@/features/archive/types';
import { PlaceSearchPanel } from './PlaceSearchPanel';

const ARCHIVES: Archive[] = [
  { id: 1, name: '카페', color: 'yellow', placeCount: 3, accessType: 'OWNED' },
  { id: 2, name: '밥집', color: 'blue', placeCount: 2, accessType: 'OWNED' },
];

// 아카이브 칩은 실제 목록 API 를 쓴다 — HTTP 전송이 아니라 배선만 검증한다.
// 검색 자체는 mock(`savedPlaceSearch`)이 실제 구현이라 그대로 태운다.
const mocks = vi.hoisted(() => ({ fetchArchives: vi.fn() }));
vi.mock('@/features/archive/api', () => mocks);

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
    mocks.fetchArchives.mockReset().mockResolvedValue(ARCHIVES);
  });

  it('검색 전(빈 검색어)에는 칩·건수를 보여주지 않는다', () => {
    renderPanel();

    expect(screen.queryByRole('button', { name: '전체' })).not.toBeInTheDocument();
    expect(screen.queryByText('건')).not.toBeInTheDocument();
  });

  it('검색어를 입력하면 일치하는 장소 카드와 건수가 보인다', async () => {
    renderPanel();

    typeQuery('하우스오브');

    expect(await screen.findByText('하우스 오브 와일드')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('건')).toBeInTheDocument();
  });

  it('일치하는 장소가 없으면 빈 상태 문구를 보여준다', async () => {
    renderPanel();

    typeQuery('존재하지않는장소이름');

    expect(await screen.findByText('아직 저장한 공간이 없어요')).toBeInTheDocument();
  });

  it('아카이브 칩을 누르면 그 아카이브의 장소만 남는다', async () => {
    renderPanel();

    typeQuery('성수');
    // mock 데이터 기준 '성수'는 여러 아카이브에 걸쳐 있다.
    expect(await screen.findByText('성수 세터커피')).toBeInTheDocument();
    expect(screen.getByText('성수동 비터앤츠')).toBeInTheDocument();

    // 정확 일치 — 장소 카드의 접근성 이름에도 카테고리("카페")가 들어가 정규식이면 겹친다.
    fireEvent.click(await screen.findByRole('button', { name: '카페' }));

    // keepPreviousData 로 직전 결과가 잠깐 유지되므로, 필터된 새 결과가 반영될 때까지 기다린다.
    await waitFor(() => {
      expect(screen.queryByText('성수동 비터앤츠')).not.toBeInTheDocument();
    });
    expect(screen.getByText('성수 세터커피')).toBeInTheDocument();
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

    typeQuery('하우스오브');
    fireEvent.click(await screen.findByRole('button', { name: /하우스 오브 와일드/ }));

    expect(onSelectPlace).toHaveBeenCalledWith(1);
  });
});
