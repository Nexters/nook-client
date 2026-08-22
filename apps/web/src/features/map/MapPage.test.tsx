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
  const {
    DETAIL_COMPACT_SNAP_POINT,
    DETAIL_PAGE_SNAP_POINT,
    MID_SNAP_POINT,
    PEEK_SNAP_POINT,
    FULL_SNAP_POINT,
  } = await import('@/features/map/constants');
  return {
    PlaceSheet: ({
      selectedPlace,
      snap,
      instantOpen,
      isSearchMode,
      onSnapChange,
      onSelectPlace,
      onClose,
      onEnterSearch,
      onExitSearch,
      onSearchInputFocus,
    }: {
      selectedPlace: { name: string } | null;
      snap: number | string | null;
      instantOpen?: boolean;
      isSearchMode: boolean;
      onSnapChange: (snap: number | string | null) => void;
      onSelectPlace: (id: number, shareToken?: string | null) => void;
      onClose: () => void;
      onEnterSearch: () => void;
      onExitSearch: () => void;
      onSearchInputFocus: () => void;
    }) => (
      <div>
        <p>{selectedPlace ? `선택됨: ${selectedPlace.name}` : '선택 없음'}</p>
        <p>스냅: {String(snap)}</p>
        <p>즉시열림: {String(instantOpen ?? false)}</p>
        <p>검색모드: {String(isSearchMode)}</p>
        <button type="button" onClick={() => onSelectPlace(1)}>
          검색 결과 선택
        </button>
        {/* 최근 저장한 공간의 구독 아카이브 장소 — 카드가 토큰을 함께 넘긴다. */}
        <button type="button" onClick={() => onSelectPlace(9, 'tok-shared')}>
          공유 장소 선택
        </button>
        <button type="button" onClick={() => onSnapChange(PEEK_SNAP_POINT)}>
          시트 내리기
        </button>
        <button type="button" onClick={() => onSnapChange(DETAIL_COMPACT_SNAP_POINT)}>
          시트 최저 높이로
        </button>
        <button type="button" onClick={onClose}>
          상세 닫기
        </button>
        <button type="button" onClick={() => onSnapChange(DETAIL_PAGE_SNAP_POINT)}>
          시트 상세 높이로
        </button>
        <button type="button" onClick={() => onSnapChange(MID_SNAP_POINT)}>
          시트 중간 높이로
        </button>
        <button type="button" onClick={() => onSnapChange(FULL_SNAP_POINT)}>
          시트 펼치기
        </button>
        <button type="button" onClick={onEnterSearch}>
          검색 진입
        </button>
        <button type="button" onClick={onExitSearch}>
          검색 닫기
        </button>
        <button type="button" onClick={onSearchInputFocus}>
          검색 입력 포커스
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

/**
 * iOS 좌측 엣지 스와이프·Android 하드웨어 백이 하는 일 — 히스토리 되감기 하나다.
 * 스와이프는 WKWebView 가 직접 되감아 JS 를 거치지 않으므로, 웹에서 검증할 수 있는
 * 것도 "되감으면 무엇이 되는가"뿐이다.
 */
function HistoryBackProbe() {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(-1)}>
      뒤로가기
    </button>
  );
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

/**
 * `from` 을 주면 그 화면에서 지도로 넘어온 히스토리를 만든다 — 되감을 엔트리가 있는
 * 상태(딥링크 진입 등)와 없는 상태를 구분해야 하는 테스트에서 쓴다.
 */
function renderMapAt(entry: string, { from }: { from?: string } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <BottomMenuVisibilityProvider value={{ hidden: false, setHidden: () => {} }}>
        <MemoryRouter initialEntries={from ? [from, entry] : [entry]}>
          <LocationProbe />
          <MapTabLinkProbe />
          <HistoryBackProbe />
          <Routes>
            <Route path="/map" element={<MapPage />} />
            <Route path="/before" element={<p>지도에 오기 전 화면</p>} />
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
        // 도메인 타입상 필수 — 사진 유무가 상세 스냅 배열을 가른다(사진 있는 쪽이 기본).
        photos: ['https://img/1.jpg'],
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
        photos: ['https://img/1.jpg'],
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

  it('상세 헤더의 닫기를 누르면 선택이 풀리고 목록이 최소 높이로 돌아온다', async () => {
    const { PEEK_SNAP_POINT } = await import('@/features/map/constants');
    renderMapAt('/map?placeId=5');
    await screen.findByText('선택됨: 장소 5');

    fireEvent.click(screen.getByRole('button', { name: '상세 닫기' }));

    await screen.findByText('선택 없음');
    await screen.findByText(`스냅: ${PEEK_SNAP_POINT}`);
    await waitFor(() => expect(screen.getByTestId('search-params')).toHaveTextContent(/^$/));
  });

  it('상세를 최저 스냅까지 끌어내려도 선택은 유지된다 — 목록으로 나가는 길은 닫기 버튼뿐이다', async () => {
    const { DETAIL_COMPACT_SNAP_POINT } = await import('@/features/map/constants');
    renderMapAt('/map?placeId=5');
    await screen.findByText('선택됨: 장소 5');

    fireEvent.click(screen.getByRole('button', { name: '시트 최저 높이로' }));

    await screen.findByText(`스냅: ${DETAIL_COMPACT_SNAP_POINT}`);
    expect(screen.getByText('선택됨: 장소 5')).toBeInTheDocument();
    expect(screen.getByTestId('search-params')).toHaveTextContent('placeId=5');
  });

  it('사진이 없는 장소는 기본 높이(detailPage) 대신 최저 스냅으로 접혀 열린다', async () => {
    const { DETAIL_COMPACT_SNAP_POINT } = await import('@/features/map/constants');
    mocks.fetchPlaceDetail.mockResolvedValue({
      id: 5,
      name: '장소 5',
      lat: 37.478,
      lng: 126.951,
      bookmarked: true,
      thumbnail: null,
      photos: [],
    });

    renderMapAt('/map?placeId=5');

    await screen.findByText('선택됨: 장소 5');
    // detailPage(0.5)는 사진 자리를 포함한 높이라 사진 없는 장소의 스냅 배열에 없다.
    await screen.findByText(`스냅: ${DETAIL_COMPACT_SNAP_POINT}`);
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
      photos: ['https://img/1.jpg'],
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

  it('구독한 공유 아카이브의 장소를 고르면 그 토큰을 URL 에 실어 공유 공개 API 로 조회한다', async () => {
    renderMapAt('/map');
    await screen.findByText('선택 없음');

    fireEvent.click(screen.getByRole('button', { name: '공유 장소 선택' }));

    // 내 API 로는 게시물이 비어 내려오는 장소라, 반드시 공유 공개 API 를 타야 한다.
    await screen.findByText('선택됨: 공유 장소 9');
    expect(mocks.fetchSharedPlaceDetail).toHaveBeenCalledWith('tok-shared', 9);
    expect(mocks.fetchPlaceDetail).not.toHaveBeenCalled();
    // 토큰이 URL 에 남아야 아카이브 상세 등으로 나갔다 뒤로 돌아와도 같은 화면이 복원된다.
    expect(screen.getByTestId('search-params')).toHaveTextContent('shareToken=tok-shared');
  });

  it('공유 장소를 본 뒤 내 장소를 고르면 토큰이 버려져 내 API 로 돌아온다', async () => {
    renderMapAt('/map');
    await screen.findByText('선택 없음');

    fireEvent.click(screen.getByRole('button', { name: '공유 장소 선택' }));
    await screen.findByText('선택됨: 공유 장소 9');

    fireEvent.click(screen.getByRole('button', { name: '핀 7 클릭' }));

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
    // 목록 모드에도 있는 스냅(full)에서 눌러도 최소 높이로 돌아와야 한다(QA).
    fireEvent.click(screen.getByRole('button', { name: '시트 펼치기' }));

    fireEvent.click(screen.getByRole('button', { name: '지도 탭' }));

    await screen.findByText('선택 없음');
    await screen.findByText(`스냅: ${PEEK_SNAP_POINT}`);
  });

  it('검색에 진입해도 스냅은 그대로다 — 최근 저장한 공간에서 보던 높이 그대로 검색으로 넘어간다', async () => {
    const { PEEK_SNAP_POINT } = await import('@/features/map/constants');
    renderMapAt('/map');
    await screen.findByText(`스냅: ${PEEK_SNAP_POINT}`);

    fireEvent.click(screen.getByRole('button', { name: '검색 진입' }));

    await screen.findByText(`스냅: ${PEEK_SNAP_POINT}`);
  });

  it('검색을 닫아도 스냅은 그대로다', async () => {
    const { MID_SNAP_POINT, PEEK_SNAP_POINT } = await import('@/features/map/constants');
    renderMapAt('/map');
    await screen.findByText(`스냅: ${PEEK_SNAP_POINT}`);

    fireEvent.click(screen.getByRole('button', { name: '검색 진입' }));
    fireEvent.click(screen.getByRole('button', { name: '시트 중간 높이로' }));
    fireEvent.click(screen.getByRole('button', { name: '검색 닫기' }));

    await screen.findByText(`스냅: ${MID_SNAP_POINT}`);
  });

  it('peek 에서 검색 입력에 포커스되면 mid 로 올라간다 — 키보드가 시트를 가리지 않게', async () => {
    const { MID_SNAP_POINT, PEEK_SNAP_POINT } = await import('@/features/map/constants');
    renderMapAt('/map');
    await screen.findByText(`스냅: ${PEEK_SNAP_POINT}`);

    fireEvent.click(screen.getByRole('button', { name: '검색 진입' }));
    fireEvent.click(screen.getByRole('button', { name: '검색 입력 포커스' }));

    await screen.findByText(`스냅: ${MID_SNAP_POINT}`);
  });

  it('검색 결과에서 장소를 고르면 검색이 닫히고 선택이 URL 에 실린다', async () => {
    renderMapAt('/map');
    await screen.findByText('검색모드: false');

    fireEvent.click(screen.getByRole('button', { name: '검색 진입' }));
    await screen.findByText('검색모드: true');

    fireEvent.click(screen.getByRole('button', { name: '검색 결과 선택' }));

    await screen.findByText('검색모드: false');
    expect(screen.getByTestId('search-params').textContent).toBe('?placeId=1');
  });

  it('mid/full 등 peek 이 아닌 높이에서는 입력 포커스가 스냅을 바꾸지 않는다', async () => {
    const { FULL_SNAP_POINT, PEEK_SNAP_POINT } = await import('@/features/map/constants');
    renderMapAt('/map');
    await screen.findByText(`스냅: ${PEEK_SNAP_POINT}`);

    fireEvent.click(screen.getByRole('button', { name: '검색 진입' }));
    fireEvent.click(screen.getByRole('button', { name: '시트 펼치기' }));
    fireEvent.click(screen.getByRole('button', { name: '검색 입력 포커스' }));

    await screen.findByText(`스냅: ${FULL_SNAP_POINT}`);
  });
});

/**
 * iOS 좌측 엣지 스와이프는 WKWebView 가 자기 히스토리를 되감는 동작이라 웹이 목적지를
 * 정할 수 없다 — 정할 수 있는 건 "직전 엔트리가 무엇인가"뿐이다. 전체화면 상세에서
 * 스와이프가 상세 닫기가 되도록, 상세를 열 때 엔트리를 하나 쌓는다.
 */
describe('MapPage — 상세의 히스토리 엔트리', () => {
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
        photos: ['https://img/1.jpg'],
      }),
    );
  });

  it('목록에서 상세를 열면 뒤로가기가 상세만 닫는다 — 지도를 떠나지 않는다', async () => {
    const { PEEK_SNAP_POINT } = await import('@/features/map/constants');
    renderMapAt('/map', { from: '/before' });

    fireEvent.click(await screen.findByRole('button', { name: '핀 7 클릭' }));
    await screen.findByText('선택됨: 장소 7');

    fireEvent.click(screen.getByRole('button', { name: '뒤로가기' }));

    await screen.findByText('선택 없음');
    await screen.findByText(`스냅: ${PEEK_SNAP_POINT}`);
    expect(screen.queryByText('지도에 오기 전 화면')).not.toBeInTheDocument();
  });

  it('전체화면(full)까지 펼친 뒤 뒤로가기해도 한 번에 목록으로 돌아온다 — 스냅 기록은 엔트리를 쌓지 않는다', async () => {
    renderMapAt('/map', { from: '/before' });

    fireEvent.click(await screen.findByRole('button', { name: '핀 7 클릭' }));
    await screen.findByText('선택됨: 장소 7');
    fireEvent.click(screen.getByRole('button', { name: '시트 펼치기' }));
    await waitFor(() => expect(screen.getByTestId('search-params')).toHaveTextContent('snap=1'));

    fireEvent.click(screen.getByRole('button', { name: '뒤로가기' }));

    await screen.findByText('선택 없음');
    expect(screen.queryByText('지도에 오기 전 화면')).not.toBeInTheDocument();
  });

  it('보던 장소를 다른 장소로 바꿔도 엔트리를 더 쌓지 않는다 — 뒤로가기 한 번에 목록이다', async () => {
    renderMapAt('/map', { from: '/before' });

    fireEvent.click(await screen.findByRole('button', { name: '핀 7 클릭' }));
    await screen.findByText('선택됨: 장소 7');
    fireEvent.click(screen.getByRole('button', { name: '검색 결과 선택' }));
    await screen.findByText('선택됨: 장소 1');

    fireEvent.click(screen.getByRole('button', { name: '뒤로가기' }));

    await screen.findByText('선택 없음');
    expect(screen.queryByText('지도에 오기 전 화면')).not.toBeInTheDocument();
  });

  it('상세를 닫으면 그 엔트리도 함께 사라진다 — 앞으로가기로 되살아나지 않는다', async () => {
    renderMapAt('/map', { from: '/before' });

    fireEvent.click(await screen.findByRole('button', { name: '핀 7 클릭' }));
    await screen.findByText('선택됨: 장소 7');
    fireEvent.click(screen.getByRole('button', { name: '상세 닫기' }));
    await screen.findByText('선택 없음');

    // 파라미터만 지웠다면 엔트리가 남아 이 되감기가 방금 닫은 상세로 돌아간다.
    fireEvent.click(screen.getByRole('button', { name: '뒤로가기' }));

    expect(await screen.findByText('지도에 오기 전 화면')).toBeInTheDocument();
  });

  it('딥링크로 곧장 들어온 상세의 닫기는 히스토리를 되감지 않는다 — 지도에 남는다', async () => {
    renderMapAt('/map?placeId=5', { from: '/before' });
    await screen.findByText('선택됨: 장소 5');

    fireEvent.click(screen.getByRole('button', { name: '상세 닫기' }));

    await screen.findByText('선택 없음');
    expect(screen.queryByText('지도에 오기 전 화면')).not.toBeInTheDocument();
  });
});
