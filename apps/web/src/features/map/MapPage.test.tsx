import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BottomMenuVisibilityProvider } from '@/app/bottom-menu-visibility';

// 데이터는 feature api 모듈을 거친다 — HTTP 가 아니라 페이지 ↔ Query ↔ api 배선만 검증한다.
const mocks = vi.hoisted(() => ({
  fetchMapPins: vi.fn(),
  fetchRecentPlaces: vi.fn(),
  fetchPlaceDetail: vi.fn(),
  fetchSharedPlaceDetail: vi.fn(),
  disconnectPostPlace: vi.fn(),
  updatePlaceBookmark: vi.fn(),
  updatePlaceMemo: vi.fn(),
}));

vi.mock('@/features/map/api', () => mocks);

// 네이버 지도 SDK 는 jsdom 에서 로드할 수 없다 — 핀 클릭 콜백만 노출하는 스텁으로 대체한다.
vi.mock('@/features/map/components/MapView', () => ({
  MapView: ({ onPlaceClick }: { onPlaceClick: (id: number) => void }) => (
    <button type="button" onClick={() => onPlaceClick(7)}>
      핀 7 클릭
    </button>
  ),
}));

// 시트(vaul)는 선택 상태 표시와 스냅 변경 콜백만 노출하는 스텁으로 대체한다 —
// 여기서 검증하는 건 MapPage 의 "URL(?placeId=) ↔ 선택 상태" 배선뿐이다.
vi.mock('@/features/map/components/PlaceSheet', async () => {
  const { PEEK_SNAP_POINT, DETAIL_PAGE_SNAP_POINT, FULL_SNAP_POINT } = await import(
    '@/features/map/constants'
  );
  return {
    PlaceSheet: ({
      selectedPlace,
      snap,
      instantOpen,
      onSnapChange,
    }: {
      selectedPlace: { name: string } | null;
      snap: number | string | null;
      instantOpen?: boolean;
      onSnapChange: (snap: number | string | null) => void;
    }) => (
      <div>
        <p>{selectedPlace ? `선택됨: ${selectedPlace.name}` : '선택 없음'}</p>
        <p>스냅: {String(snap)}</p>
        <p>즉시열림: {String(instantOpen ?? false)}</p>
        <button type="button" onClick={() => onSnapChange(PEEK_SNAP_POINT)}>
          시트 내리기
        </button>
        <button type="button" onClick={() => onSnapChange(DETAIL_PAGE_SNAP_POINT)}>
          시트 상세 높이로
        </button>
        <button type="button" onClick={() => onSnapChange(FULL_SNAP_POINT)}>
          시트 펼치기
        </button>
      </div>
    ),
  };
});

const { MapPage } = await import('./MapPage');

/** 현재 URL 의 쿼리스트링을 그대로 보여주는 프로브. */
function LocationProbe() {
  const location = useLocation();
  return <output data-testid="search-params">{location.search}</output>;
}

/** 하단 탭바의 "지도" 링크처럼 파라미터 없는 `/map` 으로 이동하는 프로브. */
function MapTabLinkProbe() {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate('/map')}>
      지도 탭
    </button>
  );
}

function renderMapAt(entry: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <BottomMenuVisibilityProvider value={{ hidden: false, setHidden: () => {} }}>
        <MemoryRouter initialEntries={[entry]}>
          <LocationProbe />
          <MapTabLinkProbe />
          <Routes>
            <Route path="/map" element={<MapPage />} />
          </Routes>
        </MemoryRouter>
      </BottomMenuVisibilityProvider>
    </QueryClientProvider>,
  );
}

describe('MapPage — 선택 장소의 URL(?placeId=) 동기화', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchMapPins.mockResolvedValue([]);
    mocks.fetchRecentPlaces.mockResolvedValue([]);
    mocks.fetchPlaceDetail.mockImplementation((id: number) =>
      Promise.resolve({
        id,
        name: `장소 ${id}`,
        lat: 37.478,
        lng: 126.951,
        bookmarked: true,
        thumbnail: null,
      }),
    );
    // shareToken 이 있으면 이 쪽만 불린다(내 API 는 아예 안 탄다) — 이름을 다르게 둬서
    // 어느 경로로 조회됐는지 텍스트로 구분할 수 있게 한다.
    mocks.fetchSharedPlaceDetail.mockImplementation((_token: string, id: number) =>
      Promise.resolve({
        id,
        name: `공유 장소 ${id}`,
        lat: 37.478,
        lng: 126.951,
        bookmarked: false,
        thumbnail: null,
      }),
    );
  });

  it('?placeId= 로 들어오면 해당 장소를 선택하고, 파라미터를 URL 에 유지한다', async () => {
    renderMapAt('/map?placeId=5');

    // 파라미터가 유지돼야 아카이브 상세 등으로 나갔다 뒤로 돌아왔을 때 이 화면이 복원된다.
    expect(await screen.findByText('선택됨: 장소 5')).toBeInTheDocument();
    expect(screen.getByTestId('search-params')).toHaveTextContent('?placeId=5');
  });

  it('핀을 클릭하면 선택이 URL 에 반영된다', async () => {
    renderMapAt('/map');

    fireEvent.click(await screen.findByRole('button', { name: '핀 7 클릭' }));

    expect(await screen.findByText('선택됨: 장소 7')).toBeInTheDocument();
    expect(screen.getByTestId('search-params')).toHaveTextContent('?placeId=7');
  });

  it('시트를 peek 까지 내려 선택을 해제하면 placeId 가 URL 에서 사라진다', async () => {
    renderMapAt('/map?placeId=5');
    await screen.findByText('선택됨: 장소 5');

    fireEvent.click(screen.getByRole('button', { name: '시트 내리기' }));

    await screen.findByText('선택 없음');
    await waitFor(() => expect(screen.getByTestId('search-params')).toHaveTextContent(/^$/));
  });

  it('상세를 펼치면(full) 스냅이 URL 에 기록되고, 기본 높이(0.5)로 돌아오면 파라미터가 사라진다', async () => {
    renderMapAt('/map?placeId=5');
    await screen.findByText('선택됨: 장소 5');

    fireEvent.click(screen.getByRole('button', { name: '시트 펼치기' }));
    await waitFor(() =>
      expect(screen.getByTestId('search-params')).toHaveTextContent('placeId=5&snap=1'),
    );

    fireEvent.click(screen.getByRole('button', { name: '시트 상세 높이로' }));
    await waitFor(() =>
      expect(screen.getByTestId('search-params')).toHaveTextContent(/^\?placeId=5$/),
    );
  });

  it('?snap= 이 기록된 URL 로 돌아오면 보던 높이 그대로 복원된다', async () => {
    renderMapAt('/map?placeId=5&snap=1');

    await screen.findByText('선택됨: 장소 5');
    expect(screen.getByText('스냅: 1')).toBeInTheDocument();
  });

  it('다른 장소를 선택하면 이전 장소의 스냅 기록은 버린다', async () => {
    renderMapAt('/map?placeId=5&snap=1');
    await screen.findByText('선택됨: 장소 5');

    fireEvent.click(screen.getByRole('button', { name: '핀 7 클릭' }));

    await screen.findByText('선택됨: 장소 7');
    expect(screen.getByTestId('search-params')).toHaveTextContent(/^\?placeId=7$/);
  });

  it('?shareToken= 동반 진입은 항상 공유 공개 API 로 조회한다 — 이미 저장한 장소라도 공유자 기준으로 본다', async () => {
    mocks.fetchSharedPlaceDetail.mockResolvedValue({
      id: 5,
      name: '공유 장소 5',
      lat: 37.478,
      lng: 126.951,
      bookmarked: false,
      thumbnail: null,
    });

    renderMapAt('/map?placeId=5&shareToken=tok-123');

    expect(await screen.findByText('선택됨: 공유 장소 5')).toBeInTheDocument();
    expect(mocks.fetchSharedPlaceDetail).toHaveBeenCalledWith('tok-123', 5);
    expect(mocks.fetchPlaceDetail).not.toHaveBeenCalled();
  });

  it('?shareToken= 없이 들어오면 내 상세 API 만 쓴다', async () => {
    renderMapAt('/map?placeId=5');

    expect(await screen.findByText('선택됨: 장소 5')).toBeInTheDocument();
    expect(mocks.fetchSharedPlaceDetail).not.toHaveBeenCalled();
  });

  it('다른 장소를 선택하면 공유 토큰은 새 장소와 무관하므로 함께 버린다', async () => {
    renderMapAt('/map?placeId=5&shareToken=tok-123');
    // shareToken 이 있는 동안엔 공유 공개 API 로 조회된다.
    await screen.findByText('선택됨: 공유 장소 5');

    fireEvent.click(screen.getByRole('button', { name: '핀 7 클릭' }));

    // 토큰이 버려졌으니 이후 선택은 내 상세 API 로 조회된다.
    await screen.findByText('선택됨: 장소 7');
    expect(screen.getByTestId('search-params')).toHaveTextContent(/^\?placeId=7$/);
  });

  it('뒤로가기/직접 진입(POP)으로 장소가 선택된 채 마운트되면 시트를 모션 없이 즉시 연다', async () => {
    renderMapAt('/map?placeId=5');

    await screen.findByText('선택됨: 장소 5');
    expect(screen.getByText('즉시열림: true')).toBeInTheDocument();
  });

  it('선택 장소 없이 마운트되면 시트 오프닝 모션을 유지한다', async () => {
    renderMapAt('/map');

    await screen.findByRole('button', { name: '핀 7 클릭' });
    expect(screen.getByText('즉시열림: false')).toBeInTheDocument();
  });

  it('선택 상태에서 지도 탭을 다시 누르면(파라미터 없는 /map 이동) 선택이 풀리고 상세 전용 스냅에서 벗어난다', async () => {
    const { PEEK_SNAP_POINT } = await import('@/features/map/constants');
    renderMapAt('/map?placeId=5');
    await screen.findByText('선택됨: 장소 5');

    fireEvent.click(screen.getByRole('button', { name: '지도 탭' }));

    await screen.findByText('선택 없음');
    // 상세 전용 스냅(detailPage)은 목록 모드 스냅 배열에 없다 — peek 으로 돌아와야 한다.
    await screen.findByText(`스냅: ${PEEK_SNAP_POINT}`);
  });
});
