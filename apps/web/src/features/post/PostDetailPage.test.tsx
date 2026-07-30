import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BottomMenuVisibilityProvider } from '@/app/bottom-menu-visibility';
import type { PlaceParsingResult, PostDetail } from '@/features/post/types';

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

function renderRoute(initialPath: string) {
  // 전역 queryClient(retry: 1) 대신 재시도 없는 클라이언트 — 에러 케이스 테스트가 느려지지 않게.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <BottomMenuVisibilityProvider value={{ hidden: false, setHidden: () => {} }}>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/post/:postId" element={<PostDetailPage />} />
          </Routes>
        </MemoryRouter>
      </BottomMenuVisibilityProvider>
    </QueryClientProvider>,
  );
}

async function renderPost(postId: number) {
  renderRoute(`/post/${postId}`);
  // 게시물 상세와 연관 장소 모두 별도 API 로 비동기 로드된다 — 둘 다 정착할 때까지 기다린다.
  await waitFor(() => expect(screen.queryByText('불러오는 중…')).not.toBeInTheDocument());
  await waitFor(() => expect(screen.queryByText('연관 장소를 찾는 중…')).not.toBeInTheDocument());
}

describe('게시물 상세', () => {
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

    expect(screen.getByText('불러오는 중…')).toBeInTheDocument();

    await waitFor(() => expect(screen.queryByText('불러오는 중…')).not.toBeInTheDocument());
    expect(screen.getByRole('heading', { name: '지금 가기 좋은 초록뷰 카페' })).toBeInTheDocument();
  });

  it('게시물 조회에 실패하면 안내 문구를 보여준다', async () => {
    mocks.fetchPostDetail.mockRejectedValue(new Error('404'));
    renderRoute('/post/999');

    await waitFor(() => expect(screen.getByText('게시물을 찾을 수 없어요')).toBeInTheDocument());
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

  it('매칭된 장소가 없으면 목록 없이 직접 추가 배너만 보여준다', async () => {
    await renderPost(2);

    expect(screen.getByRole('heading', { name: '연관 장소' })).toBeInTheDocument();
    expect(screen.queryByText('아이소')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /직접 추가/ })).toBeInTheDocument();
  });

  it('연관 장소 파싱이 실패하면 에러 스낵바를 보여준다', async () => {
    await renderPost(3);

    expect(screen.getByRole('heading', { name: '연관 장소' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /직접 추가/ })).toBeInTheDocument();
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

  it('직접 추가 배너를 누르면 장소 검색 드로어가 열린다', async () => {
    await renderPost(1);

    fireEvent.click(screen.getByRole('button', { name: /직접 추가/ }));

    expect(screen.getByPlaceholderText('장소명을 입력해주세요')).toBeInTheDocument();
  });

  it('드로어에 검색어를 입력하면 이름이 일치하는 장소 목록이 뜬다', async () => {
    await renderPost(1);

    fireEvent.click(screen.getByRole('button', { name: /직접 추가/ }));
    fireEvent.change(screen.getByPlaceholderText('장소명을 입력해주세요'), {
      target: { value: '앤미' },
    });

    expect(screen.getByText('앤미용실')).toBeInTheDocument();
  });

  it('검색 결과에서 장소를 확정하면 연관 장소에 연결되고 드로어가 닫힌다', async () => {
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
