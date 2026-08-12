import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BottomMenuVisibilityProvider } from '@/app/bottom-menu-visibility';
import emptyThumbnail from '@/assets/images/98_Group.svg';
import type { PlaceParsingResult, PostDetail } from '@/features/post/types';
import { ToastProvider } from '@/shared/toast';

// HTTP 전송이 아니라 화면 ↔ Query ↔ feature API 배선만 검증한다.
const mocks = vi.hoisted(() => ({
  fetchPostDetail: vi.fn(),
  fetchPlaceParsing: vi.fn(),
  updatePostMemo: vi.fn(),
  updatePlaceBookmark: vi.fn(),
}));

vi.mock('@/features/post/api', () => mocks);

// vi.mock 뒤에 두어야 모킹된 모듈을 가져온다.
const { PostDetailPage } = await import('@/features/post/PostDetailPage');

const POSTS: Record<number, PostDetail> = {
  1: {
    processingStatus: 'COMPLETED',
    processingPercent: 100,
    places: [],
    title: '지금 가기 좋은 초록뷰 카페',
    groups: [{ id: 1, name: '카페', color: 'yellow' }],
    memo: '지우랑 가면 좋겠다',
    post: {
      id: '1',
      authorHandle: '@nook.official on instagram',
      caption: '초록뷰가 아름다운 카페 공간\n\n#숲뷰 #카페추천',
      images: ['image-a.png', 'image-b.png'],
      originalUrl: 'https://instagram.com',
    },
  },
  // 시안 `연관 장소 X` — 파싱은 성공했지만 연결된 장소가 없는 게시물.
  2: {
    processingStatus: 'COMPLETED',
    processingPercent: 100,
    places: [],
    title: '몰래 가려고 저장해둔 서울 카페',
    groups: [{ id: 1, name: '카페', color: 'yellow' }],
    post: {
      id: '2',
      authorHandle: '@nook.official on instagram',
      caption: '조용히 혼자 가고 싶은 서울 카페들을 모아뒀어요.',
      images: ['image-b.png'],
      originalUrl: 'https://instagram.com',
    },
  },
  // 시안 `게시물 상세_직접 입력` 실패 케이스 — 연관 장소 파싱 자체가 실패하는 게시물.
  3: {
    processingStatus: 'COMPLETED',
    processingPercent: 100,
    places: [],
    title: '위치 태그 없이 올라온 카페 사진',
    groups: [{ id: 1, name: '카페', color: 'yellow' }],
    post: {
      id: '3',
      authorHandle: '@nook.official on instagram',
      caption: '위치 정보 없이 올라온 게시물이라 연관 장소 파싱이 실패할 수 있어요.',
      images: ['image-d.png'],
      originalUrl: 'https://instagram.com',
    },
  },
};

const PLACES: PlaceParsingResult['places'] = [
  {
    id: 101,
    provider: 'kakao',
    externalPlaceId: 'kakao-place-1',
    name: '아이소',
    address: '경기 용인시 처인구 양지읍 은이로 72',
    latitude: 37.2,
    longitude: 127.2,
    category: '카페',
    phoneNumber: null,
    // 시안: 앞의 두 장소만 파란 북마크(저장됨)
    bookmarked: true,
    thumbnailParsingStatus: 'COMPLETED',
  },
  {
    id: 102,
    provider: 'kakao',
    externalPlaceId: 'kakao-place-2',
    name: '퍼머넌트해비탯',
    address: '경기 용인시 처인구 양지읍 은이로 72',
    latitude: 37.2,
    longitude: 127.2,
    category: '카페',
    phoneNumber: null,
    bookmarked: true,
    thumbnailParsingStatus: 'COMPLETED',
  },
  {
    id: 103,
    provider: 'kakao',
    externalPlaceId: 'kakao-place-3',
    name: '탐석과 사랑',
    address: '경기 용인시 처인구 양지읍 은이로 72',
    latitude: 37.2,
    longitude: 127.2,
    category: '카페',
    phoneNumber: null,
    bookmarked: false,
    thumbnailParsingStatus: 'COMPLETED',
  },
];

const PLACE_PARSING: Record<number, PlaceParsingResult> = {
  1: { postId: 1, placeParsingStatus: 'COMPLETED', failureReason: null, places: PLACES },
  2: { postId: 2, placeParsingStatus: 'COMPLETED', failureReason: null, places: [] },
  3: {
    postId: 3,
    placeParsingStatus: 'FAILED',
    failureReason: '게시물에서 위치 정보를 찾지 못했어요',
    places: [],
  },
};

/** 연관 장소 클릭 시 실제로 어디로 이동했는지 확인하기 위한 `/map` 자리의 더미 화면. */
function MapRouteProbe() {
  const location = useLocation();
  return <p data-testid="map-route-probe">{location.pathname + location.search}</p>;
}

function GroupRouteProbe() {
  return <p>그룹 상세 화면</p>;
}

function renderRoute(initialPath: string, initialEntries = [initialPath]) {
  // 전역 queryClient(retry: 1) 대신 재시도 없는 클라이언트 — 에러 케이스 테스트가 느려지지 않게.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BottomMenuVisibilityProvider value={{ hidden: false, setHidden: () => {} }}>
          <MemoryRouter initialEntries={initialEntries}>
            <Routes>
              <Route path="/post/:postId" element={<PostDetailPage />} />
              <Route path="/map" element={<MapRouteProbe />} />
              <Route path="/group/:groupId" element={<GroupRouteProbe />} />
            </Routes>
          </MemoryRouter>
        </BottomMenuVisibilityProvider>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

async function renderPost(postId: number, search = '', initialEntries?: string[]) {
  renderRoute(`/post/${postId}${search}`, initialEntries);
  // 게시물 상세와 연관 장소 모두 별도 API 로 비동기 로드된다 — 둘 다 정착할 때까지 기다린다.
  await waitFor(() =>
    expect(screen.queryByRole('status', { name: '게시물 불러오는 중' })).not.toBeInTheDocument(),
  );
  await waitFor(() => expect(screen.queryByText('연관 장소를 찾는 중…')).not.toBeInTheDocument());
}

describe('게시물 상세', () => {
  // "연관 장소" 섹션 자체는 그대로 보이고, 그 안의 "찾는 장소가 없으신가요? 직접 추가"
  // 배너만 잠시 숨겨져 있다(RelatedPlacesSection.tsx 의 SHOW_DIRECT_ADD_BANNER TODO
  // 참고). 그 배너가 있어야만 가능한 상호작용을 검증하던 아래 it.skip 들은 플래그가
  // 다시 켜지면 함께 되살린다.
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchPostDetail.mockImplementation((postId: number) => Promise.resolve(POSTS[postId]));
    mocks.fetchPlaceParsing.mockImplementation((postId: number) => {
      const result = PLACE_PARSING[postId];
      return result
        ? Promise.resolve(result)
        : Promise.reject(new Error(`알 수 없는 게시물: ${postId}`));
    });
    mocks.updatePostMemo.mockResolvedValue(undefined);
    mocks.updatePlaceBookmark.mockResolvedValue(undefined);
  });

  it('게시물 상세를 불러오는 동안 로딩 문구를 보여준다', async () => {
    mocks.fetchPostDetail.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(POSTS[1]), 50)),
    );
    renderRoute('/post/1');

    expect(screen.getByRole('status', { name: '게시물 불러오는 중' })).toBeInTheDocument();
    // 첫 조회 로딩엔 파싱 화면 요소(진행률·툴팁)가 없어야 한다.
    expect(screen.queryByText(/장소 불러오는 중/)).not.toBeInTheDocument();
    expect(screen.queryByText('홈으로 가기')).not.toBeInTheDocument();

    await waitFor(() =>
      expect(screen.queryByRole('status', { name: '게시물 불러오는 중' })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('heading', { name: '지금 가기 좋은 초록뷰 카페' })).toBeInTheDocument();
  });

  it('본문 처리 중이면 진행률과 안내 문구를 보여준다', async () => {
    mocks.fetchPostDetail.mockResolvedValue({
      ...POSTS[1],
      processingStatus: 'PROCESSING',
      processingPercent: 15,
    });
    renderRoute('/post/1');

    await waitFor(() =>
      expect(screen.getByRole('status', { name: '장소 불러오는 중' })).toBeInTheDocument(),
    );
    expect(screen.getByText('장소 불러오는 중...15%')).toBeInTheDocument();
    expect(screen.getByText('화면을 나가도 저장은 계속될 거예요.')).toBeInTheDocument();
    // 첫 조회 로딩과 분리 확인 — 일반 로딩 뷰가 아니어야 한다.
    expect(screen.queryByRole('status', { name: '게시물 불러오는 중' })).not.toBeInTheDocument();
  });

  it('본문 처리 중에는 홈으로 가기 툴팁을 보여주고, 뒤로가기는 지도로 이동한다', async () => {
    mocks.fetchPostDetail.mockResolvedValue({
      ...POSTS[1],
      processingStatus: 'PROCESSING',
      processingPercent: 15,
    });
    renderRoute('/post/1', ['/group/7', '/post/1']);

    await waitFor(() => expect(screen.getByText('홈으로 가기')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));

    // 히스토리가 있어도(그룹 → 게시물) 파싱 중에는 지도로 보낸다.
    expect(screen.getByTestId('map-route-probe')).toHaveTextContent('/map');
  });

  it('게시물 조회에 실패하면 안내 문구를 보여준다', async () => {
    mocks.fetchPostDetail.mockRejectedValue(new Error('404'));
    renderRoute('/post/999');

    await waitFor(() => expect(screen.getByText('게시물을 불러오지 못했어요')).toBeInTheDocument());
  });

  it('공유하기로 진입하면 뒤로가기 시 첫 번째 연관 장소가 선택된 지도로 이동한다', async () => {
    await renderPost(1, '?entry=share');

    fireEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));

    expect(screen.getByTestId('map-route-probe')).toHaveTextContent('/map?placeId=101');
  });

  it('공유하기로 진입한 게시물에 연관 장소가 없으면 기본 지도로 이동한다', async () => {
    await renderPost(2, '?entry=share');

    fireEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));

    expect(screen.getByTestId('map-route-probe')).toHaveTextContent('/map');
  });

  it('일반 화면 이동으로 진입하면 기존 히스토리로 돌아간다', async () => {
    await renderPost(1, '', ['/group/7', '/post/1']);

    fireEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));

    expect(screen.getByText('그룹 상세 화면')).toBeInTheDocument();
  });

  it('저장된 그룹을 모두 태그 버튼으로 보여주고, 누르면 그 그룹 상세로 이동한다', async () => {
    mocks.fetchPostDetail.mockResolvedValue({
      ...POSTS[1],
      groups: [
        { id: 1, name: '카페', color: 'yellow' },
        { id: 2, name: '밥집', color: 'green' },
      ],
    });
    await renderPost(1);

    expect(screen.getByRole('button', { name: '카페' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '밥집' }));

    expect(screen.getByText('그룹 상세 화면')).toBeInTheDocument();
  });

  it('연관 장소를 불러오는 동안 로딩 문구를 보여주고 배너는 숨긴다', async () => {
    mocks.fetchPlaceParsing.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(PLACE_PARSING[1]), 50)),
    );
    renderRoute('/post/1');

    await waitFor(() => expect(screen.getByText('연관 장소를 찾는 중…')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /직접 추가/ })).not.toBeInTheDocument();

    await waitFor(() => expect(screen.queryByText('연관 장소를 찾는 중…')).not.toBeInTheDocument());
  });

  it('연관 장소가 있으면 섹션과 장소 행을 렌더한다', async () => {
    await renderPost(1);

    expect(screen.getByRole('heading', { name: '지금 가기 좋은 초록뷰 카페' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '연관 장소' })).toBeInTheDocument();
    expect(screen.getByText('아이소')).toBeInTheDocument();
  });

  it('썸네일 파싱이 끝나기 전에는 고스트를 보여주고, 완성되면 폴링으로 반영한 뒤 멈춘다', async () => {
    // 파싱 중엔 thumbnail 이 미리 내려와도 무시해야 한다 — 첫 응답에 일부러 넣어둔다.
    const parsingPlace = {
      ...PLACES[0],
      thumbnail: 'too-early.png',
      thumbnailParsingStatus: 'PROCESSING' as const,
    };
    const completedPlace = {
      ...PLACES[0],
      thumbnail: 'thumb-101.png',
      thumbnailParsingStatus: 'COMPLETED' as const,
    };
    mocks.fetchPlaceParsing
      .mockResolvedValueOnce({ ...PLACE_PARSING[1], places: [parsingPlace] })
      .mockResolvedValue({ ...PLACE_PARSING[1], places: [completedPlace] });
    vi.useFakeTimers({ shouldAdvanceTime: true });

    try {
      await renderPost(1);

      const row = screen.getByRole('button', { name: /아이소 카페/ });
      expect(row.querySelector('img')?.getAttribute('src')).toBe(emptyThumbnail);

      // 3초 폴링 주기(features/post/api/queries.ts POLL_INTERVAL_MS)로 재조회해 반영한다.
      await vi.advanceTimersByTimeAsync(3000);
      await waitFor(() =>
        expect(row.querySelector('img')?.getAttribute('src')).toBe('thumb-101.png'),
      );

      // 모든 썸네일이 종료 상태면 폴링을 멈춘다.
      const settledCalls = mocks.fetchPlaceParsing.mock.calls.length;
      await vi.advanceTimersByTimeAsync(9000);
      expect(mocks.fetchPlaceParsing.mock.calls.length).toBe(settledCalls);
    } finally {
      vi.useRealTimers();
    }
  });

  it('썸네일 파싱이 실패한 장소는 고스트로 남기고 폴링하지 않는다', async () => {
    mocks.fetchPlaceParsing.mockResolvedValue({
      ...PLACE_PARSING[1],
      places: [{ ...PLACES[0], thumbnailParsingStatus: 'FAILED' as const }],
    });
    vi.useFakeTimers({ shouldAdvanceTime: true });

    try {
      await renderPost(1);

      const row = screen.getByRole('button', { name: /아이소 카페/ });
      expect(row.querySelector('img')?.getAttribute('src')).toBe(emptyThumbnail);

      const settledCalls = mocks.fetchPlaceParsing.mock.calls.length;
      await vi.advanceTimersByTimeAsync(9000);
      expect(mocks.fetchPlaceParsing.mock.calls.length).toBe(settledCalls);
    } finally {
      vi.useRealTimers();
    }
  });

  it('매칭된 장소가 없으면 섹션은 보이되 목록도 직접 추가 배너도 없다', async () => {
    await renderPost(2);

    expect(screen.getByRole('heading', { name: '연관 장소' })).toBeInTheDocument();
    expect(screen.queryByText('아이소')).not.toBeInTheDocument();
    // "직접 추가" 배너는 잠시 숨겨져 있다(RelatedPlacesSection.tsx SHOW_DIRECT_ADD_BANNER).
    expect(screen.queryByRole('button', { name: /직접 추가/ })).not.toBeInTheDocument();
  });

  it('연관 장소 파싱이 실패하면 에러 스낵바를 보여준다', async () => {
    await renderPost(3);

    expect(screen.getByRole('heading', { name: '연관 장소' })).toBeInTheDocument();
    // "직접 추가" 배너는 잠시 숨겨져 있어 검증하지 않는다 — 이 스낵바는 그 배너와
    // 무관하게 PostDetailPage 가 독립적으로 띄운다.
    expect(screen.getByText('위치를 찾지 못 했어요')).toBeInTheDocument();
  });

  it('이미지를 누르면 확대 뷰가 열린다', async () => {
    await renderPost(1);

    // 상세의 캐러셀 이미지는 확대 뷰를 여는 버튼이다.
    fireEvent.click(screen.getByRole('button', { name: '1번째 이미지 크게 보기' }));

    // 확대 뷰가 열리면 뒤로가기 버튼이 하나 더 생긴다(상세 헤더 + 뷰어 헤더).
    expect(screen.getAllByRole('button', { name: '뒤로 가기' })).toHaveLength(2);
  });

  it('연관 장소의 즐겨찾기를 토글하면 북마크 API 를 부르고 재조회된 서버 상태를 따른다', async () => {
    // 서버 흉내: 북마크 변경이 저장됐다가 다음 파싱 재조회에 반영된다.
    const places = PLACES.map((place) => ({ ...place }));
    mocks.fetchPlaceParsing.mockImplementation(() =>
      Promise.resolve({ ...PLACE_PARSING[1], places: places.map((place) => ({ ...place })) }),
    );
    mocks.updatePlaceBookmark.mockImplementation((placeId: number, next: boolean) => {
      const target = places.find((place) => place.id === placeId);
      if (target) target.bookmarked = next;
      return Promise.resolve();
    });

    await renderPost(1);

    // 시안: 앞의 두 곳은 저장됨, 세 번째는 아님
    const saved = screen.getByRole('button', { name: '아이소 즐겨찾기' });
    const unsaved = screen.getByRole('button', { name: '탐석과 사랑 즐겨찾기' });
    expect(saved).toHaveAttribute('aria-pressed', 'true');
    expect(unsaved).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(unsaved);

    await waitFor(() => expect(mocks.updatePlaceBookmark).toHaveBeenCalledWith(103, true));
    // 성공 시 파싱 쿼리가 무효화·재조회되어 별 표시가 서버 상태를 따라 켜진다.
    await waitFor(() => expect(unsaved).toHaveAttribute('aria-pressed', 'true'));
  });

  it('연관 장소를 누르면 지도의 선택된 장소 뷰로 이동한다', async () => {
    await renderPost(1);

    fireEvent.click(screen.getByRole('button', { name: /아이소 카페/ }));

    expect(await screen.findByTestId('map-route-probe')).toHaveTextContent('/map?placeId=101');
  });

  it('본문은 접혀 있고 더보기로 펼친다', async () => {
    await renderPost(1);

    fireEvent.click(screen.getByRole('button', { name: '더보기' }));
    expect(screen.getByRole('button', { name: '접기' })).toBeInTheDocument();
  });

  it('메모하기에서 저장하면 postId 와 새 메모로 updatePostMemo 를 호출한다', async () => {
    await renderPost(1);

    fireEvent.click(screen.getByRole('button', { name: '수정' }));
    fireEvent.change(screen.getByPlaceholderText('추가로 메모하고 싶은 내용이 있나요?'), {
      target: { value: '다음엔 지우랑' },
    });
    fireEvent.click(screen.getByRole('button', { name: '저장하기' }));

    await waitFor(() => expect(mocks.updatePostMemo).toHaveBeenCalledWith(1, '다음엔 지우랑'));
  });

  it.skip('직접 추가 배너를 누르면 장소 검색 드로어가 열린다', async () => {
    await renderPost(1);

    fireEvent.click(screen.getByRole('button', { name: /직접 추가/ }));

    expect(screen.getByPlaceholderText('장소명을 입력해주세요')).toBeInTheDocument();
  });

  it.skip('드로어에 검색어를 입력하면 이름이 일치하는 장소 목록이 뜬다', async () => {
    await renderPost(1);

    fireEvent.click(screen.getByRole('button', { name: /직접 추가/ }));
    fireEvent.change(screen.getByPlaceholderText('장소명을 입력해주세요'), {
      target: { value: '앤미' },
    });

    expect(screen.getByText('앤미용실')).toBeInTheDocument();
  });

  it.skip('검색 결과에서 장소를 확정하면 연관 장소에 연결되고 드로어가 닫힌다', async () => {
    await renderPost(3); // 파싱 실패 케이스 — 직접 추가가 실제로 필요한 시나리오

    fireEvent.click(screen.getByRole('button', { name: /직접 추가/ }));
    fireEvent.change(screen.getByPlaceholderText('장소명을 입력해주세요'), {
      target: { value: '앤미' },
    });
    fireEvent.click(screen.getByText('앤미'));
    // Drawer(vaul→Radix Dialog)가 열려 있으면 Radix 가 이 형제 버튼을 aria-hidden 처리한다
    // (PlaceDirectInputDrawer 주석 참고) — RTL 기본 getByRole 은 이를 제외하므로 hidden:true 로 포함시킨다.
    fireEvent.click(screen.getByRole('button', { name: '추가하기', hidden: true }));

    expect(screen.queryByPlaceholderText('장소명을 입력해주세요')).not.toBeInTheDocument();
    expect(screen.getByText('앤미')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '앤미 즐겨찾기' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
