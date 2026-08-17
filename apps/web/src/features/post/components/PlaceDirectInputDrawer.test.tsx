import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/shared/toast';
import type { SearchedPlace } from '../types';

// 검색은 feature api 모듈을 거친다 — HTTP 가 아니라 드로어 ↔ Query ↔ api 배선만 검증한다.
// (`api/queries.ts` 가 이 모듈에서 가져오는 다른 진입점들도 함께 목으로 채운다.)
const mocks = vi.hoisted(() => ({
  searchConnectablePlaces: vi.fn(),
  connectPostPlace: vi.fn(),
  fetchPostDetail: vi.fn(),
  fetchPlaceParsing: vi.fn(),
  updatePostMemo: vi.fn(),
  updatePlaceBookmark: vi.fn(),
}));

vi.mock('@/features/post/api', () => mocks);

// 네이버 지도 SDK 는 jsdom 에서 로드할 수 없다 — 프리뷰 지도는 자리 표시 스텁으로 대체하고,
// "상세 모드에서 렌더된다"는 배선만 검증한다.
vi.mock('@/features/map/components/PlacePreviewMap', () => ({
  PlacePreviewMap: ({ place }: { place: { name: string } }) => (
    <div data-testid="place-preview-map">{place.name}</div>
  ),
}));

const { PlaceDirectInputDrawer } = await import('./PlaceDirectInputDrawer');

const SEARCHED_PLACES: SearchedPlace[] = [
  {
    id: 'token-앤미',
    selectionToken: 'token-앤미',
    name: '앤미',
    category: '일식',
    address: '서울 관악구 관악로 12길 47 (봉천동)',
    distance: '16.2km',
    latitude: 37.478,
    longitude: 126.951,
  },
  {
    id: 'token-앤미용실',
    selectionToken: 'token-앤미용실',
    name: '앤미용실',
    category: '미용실',
    address: '서울 관악구 관악로 12길 47 (봉천동)',
    latitude: 37.478,
    longitude: 126.951,
  },
];

function renderWithQuery(ui: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrap = (node: ReactElement) => (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{node}</ToastProvider>
    </QueryClientProvider>
  );
  const view = render(wrap(ui));
  return {
    ...view,
    rerender: (next: ReactElement) => view.rerender(wrap(next)),
  };
}

/** 검색어를 입력하고 디바운스 뒤 결과가 뜰 때까지 기다린다. */
async function searchFor(query: string, visibleResult: string) {
  fireEvent.change(screen.getByPlaceholderText('장소명을 입력해주세요'), {
    target: { value: query },
  });
  await screen.findByText(visibleResult);
}

describe('PlaceDirectInputDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.searchConnectablePlaces.mockResolvedValue(SEARCHED_PLACES);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('열려 있으면 검색 인풋을 보여준다', () => {
    renderWithQuery(
      <PlaceDirectInputDrawer open onOpenChange={() => {}} onPlaceConfirmed={() => {}} />,
    );

    expect(screen.getByPlaceholderText('장소명을 입력해주세요')).toBeInTheDocument();
  });

  it('검색어가 있으면 포커스 없이도 지우기 버튼이 보이고, 누르면 입력이 초기화된다', async () => {
    renderWithQuery(
      <PlaceDirectInputDrawer open onOpenChange={() => {}} onPlaceConfirmed={() => {}} />,
    );

    const input = screen.getByPlaceholderText('장소명을 입력해주세요');
    expect(screen.queryByRole('button', { name: '입력 지우기' })).not.toBeInTheDocument();

    // 값만 바꾸고 포커스는 주지 않는다 — 모바일에서 키보드를 내린(blur) 상태를 흉내낸다.
    fireEvent.change(input, { target: { value: '앤미' } });
    const clear = screen.getByRole('button', { name: '입력 지우기' });

    fireEvent.click(clear);
    expect(input).toHaveValue('');
    expect(screen.queryByRole('button', { name: '입력 지우기' })).not.toBeInTheDocument();
  });

  it('검색어를 입력하면 디바운스 후 검색 API 결과 목록이 뜬다', async () => {
    renderWithQuery(
      <PlaceDirectInputDrawer open onOpenChange={() => {}} onPlaceConfirmed={() => {}} />,
    );

    await searchFor('앤미', '앤미용실');

    // 위치 권한이 없는 환경(jsdom 에는 geolocation 이 없다)에서는 좌표 없이 검색한다.
    expect(mocks.searchConnectablePlaces).toHaveBeenCalledWith('앤미', null);
  });

  it('거리가 없는 결과는 구분점 없이 주소만 보여준다', async () => {
    renderWithQuery(
      <PlaceDirectInputDrawer open onOpenChange={() => {}} onPlaceConfirmed={() => {}} />,
    );

    await searchFor('앤미', '앤미용실');

    // 첫 결과(거리 있음)는 "주소 · 거리", 둘째 결과(거리 없음)는 주소만.
    expect(screen.getByText('서울 관악구 관악로 12길 47 (봉천동) · 16.2km')).toBeInTheDocument();
    expect(screen.getByText('서울 관악구 관악로 12길 47 (봉천동)')).toBeInTheDocument();
  });

  it('검색 결과가 없으면 목록을 보여주지 않는다', async () => {
    mocks.searchConnectablePlaces.mockResolvedValue([]);
    renderWithQuery(
      <PlaceDirectInputDrawer open onOpenChange={() => {}} onPlaceConfirmed={() => {}} />,
    );

    fireEvent.change(screen.getByPlaceholderText('장소명을 입력해주세요'), {
      target: { value: '존재하지않는장소' },
    });

    await waitFor(() =>
      expect(mocks.searchConnectablePlaces).toHaveBeenCalledWith('존재하지않는장소', null),
    );
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('검색 결과를 누르면 지도 프리뷰 위 장소 상세로 전환된다', async () => {
    renderWithQuery(
      <PlaceDirectInputDrawer open onOpenChange={() => {}} onPlaceConfirmed={() => {}} />,
    );

    await searchFor('앤미', '앤미용실');
    fireEvent.click(screen.getByText('앤미용실'));

    expect(screen.getByRole('heading', { name: '앤미용실' })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('장소명을 입력해주세요')).not.toBeInTheDocument();
    // 드로어 뒤에 선택한 장소가 핀으로 찍힌 지도 프리뷰가 깔린다.
    expect(screen.getByTestId('place-preview-map')).toHaveTextContent('앤미용실');
  });

  it('상세에 거리·주소 행을 보여준다', async () => {
    renderWithQuery(
      <PlaceDirectInputDrawer open onOpenChange={() => {}} onPlaceConfirmed={() => {}} />,
    );

    await searchFor('앤미', '앤미용실');
    fireEvent.click(screen.getByText('앤미'));

    expect(screen.getByText('16.2km · 서울 관악구 관악로 12길 47 (봉천동)')).toBeInTheDocument();
  });

  it('상세에서 주소를 복사하면 토스트가 뜬다', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    renderWithQuery(
      <PlaceDirectInputDrawer open onOpenChange={() => {}} onPlaceConfirmed={() => {}} />,
    );

    await searchFor('앤미', '앤미용실');
    fireEvent.click(screen.getByText('앤미'));
    fireEvent.click(screen.getByRole('button', { name: '주소 복사' }));

    expect(writeText).toHaveBeenCalledWith('서울 관악구 관악로 12길 47 (봉천동)');
    expect(await screen.findByText('클립보드에 복사되었습니다.')).toBeInTheDocument();
  });

  it('주소 줄의 "지도" 링크도 "지도에서 보기"와 같은 네이버 지도 링크로 나간다', async () => {
    renderWithQuery(
      <PlaceDirectInputDrawer open onOpenChange={() => {}} onPlaceConfirmed={() => {}} />,
    );

    await searchFor('앤미', '앤미용실');
    fireEvent.click(screen.getByText('앤미용실'));

    expect(screen.getByRole('link', { name: '지도' })).toHaveAttribute(
      'href',
      `https://map.naver.com/p/search/${encodeURIComponent('서울 관악구 관악로 12길 47 (봉천동) 앤미용실')}`,
    );
  });

  it('상세의 "지도에서 보기"는 네이버 지도 검색 링크로 나간다', async () => {
    renderWithQuery(
      <PlaceDirectInputDrawer open onOpenChange={() => {}} onPlaceConfirmed={() => {}} />,
    );

    await searchFor('앤미', '앤미용실');
    fireEvent.click(screen.getByText('앤미용실'));

    const link = screen.getByRole('link', { name: '지도에서 보기', hidden: true });
    expect(link).toHaveAttribute(
      'href',
      `https://map.naver.com/p/search/${encodeURIComponent('서울 관악구 관악로 12길 47 (봉천동) 앤미용실')}`,
    );
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('상세에서 "장소 추가"를 누르면 onPlaceConfirmed 가 해당 장소로 호출된다', async () => {
    const onPlaceConfirmed = vi.fn();
    renderWithQuery(
      <PlaceDirectInputDrawer open onOpenChange={() => {}} onPlaceConfirmed={onPlaceConfirmed} />,
    );

    await searchFor('앤미', '앤미용실');
    fireEvent.click(screen.getByText('앤미용실'));
    // Drawer(vaul→Radix Dialog)가 열려 있으면 Radix 가 이 형제 버튼을 aria-hidden 처리한다
    // (컴포넌트 주석 참고) — 실제 브라우저에서는 pointer-events-auto 덕에 눌리지만, RTL 의
    // 기본 getByRole 은 접근성 트리에서 숨겨진 요소를 제외하므로 hidden:true 로 포함시킨다.
    fireEvent.click(screen.getByRole('button', { name: '장소 추가', hidden: true }));

    expect(onPlaceConfirmed).toHaveBeenCalledWith(
      expect.objectContaining({ selectionToken: 'token-앤미용실' }),
    );
  });

  it('연결 요청이 진행 중이면 "장소 추가"를 누를 수 없다', async () => {
    renderWithQuery(
      <PlaceDirectInputDrawer
        open
        onOpenChange={() => {}}
        onPlaceConfirmed={() => {}}
        confirmPending
      />,
    );

    await searchFor('앤미', '앤미용실');
    fireEvent.click(screen.getByText('앤미용실'));

    expect(screen.getByRole('button', { name: '장소 추가', hidden: true })).toBeDisabled();
  });

  it('부모가 open 을 false 로 바꿔 닫으면 다시 열었을 때 검색 목록부터 다시 보여준다', async () => {
    const { rerender } = renderWithQuery(
      <PlaceDirectInputDrawer open onOpenChange={() => {}} onPlaceConfirmed={() => {}} />,
    );
    await searchFor('앤미', '앤미용실');
    fireEvent.click(screen.getByText('앤미용실'));
    expect(screen.getByRole('heading', { name: '앤미용실' })).toBeInTheDocument();

    rerender(
      <PlaceDirectInputDrawer open={false} onOpenChange={() => {}} onPlaceConfirmed={() => {}} />,
    );
    rerender(<PlaceDirectInputDrawer open onOpenChange={() => {}} onPlaceConfirmed={() => {}} />);

    expect(screen.getByPlaceholderText('장소명을 입력해주세요')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '앤미용실' })).not.toBeInTheDocument();
  });
});
