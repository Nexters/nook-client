import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlaceDetail as PlaceDetailModel, PlaceDetailPost } from '@/features/map/types';
import type { ParsedPlace, PostDetail } from '@/features/post/types';
import { ToastProvider } from '@/shared/toast';

// HTTP 전송이 아니라 "게시물 상세의 places → 게시물에 포함된 장소 섹션" 배선만 검증한다.
const mocks = vi.hoisted(() => ({
  fetchPostDetail: vi.fn(),
  updatePlaceMemo: vi.fn().mockResolvedValue(undefined),
  disconnectPostPlace: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/features/post/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/post/api')>()),
  fetchPostDetail: mocks.fetchPostDetail,
}));
vi.mock('@/features/map/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/map/api')>()),
  updatePlaceMemo: mocks.updatePlaceMemo,
  disconnectPostPlace: mocks.disconnectPostPlace,
}));

const { PlaceDetail } = await import('@/features/map/components/PlaceDetail');

function parsedPlace(id: number, name: string): ParsedPlace {
  return {
    id,
    provider: 'kakao',
    externalPlaceId: `kakao-${id}`,
    name,
    address: '서울 어딘가',
    latitude: 37.5,
    longitude: 127,
    category: '카페',
    phoneNumber: null,
    bookmarked: false,
    thumbnailParsingStatus: 'COMPLETED',
  };
}

function postDetail(places: ParsedPlace[], archives: PostDetail['archives'] = []): PostDetail {
  return {
    processingStatus: 'COMPLETED',
    processingPercent: 100,
    title: '게시물',
    archives,
    places,
    post: { id: '1', authorHandle: '@nook' },
  };
}

const PLACE: PlaceDetailModel = {
  id: 1,
  name: '아이소',
  address: '서울 어딘가',
  lat: 37.5,
  lng: 127,
  bookmarked: false,
  photos: [],
  tags: [],
  posts: [
    { id: 11, title: '게시물 A', savedAt: '2026-07-30' },
    { id: 12, title: '게시물 B', savedAt: '2026-07-30' },
  ],
};

function renderDetail(onSelectPlace?: (id: number) => void, place: PlaceDetailModel = PLACE) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/map']}>
          <Routes>
            <Route
              path="/map"
              element={
                <PlaceDetail
                  place={place}
                  expanded
                  onClose={() => {}}
                  onSelectPlace={onSelectPlace}
                />
              }
            />
            <Route path="/archive/:archiveId" element={<p>아카이브 상세 화면</p>} />
            <Route path="/place/:placeId/posts" element={<p>저장된 게시물 목록 화면</p>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('PlaceDetail 게시물에 포함된 장소', () => {
  it('저장된 게시물들의 장소에서 현재 장소를 빼고 중복 없이 보여준다', async () => {
    mocks.fetchPostDetail.mockImplementation(async (postId: number) =>
      postId === 11
        ? postDetail([parsedPlace(1, '아이소'), parsedPlace(2, '퍼머넌트해비탯')])
        : postDetail([parsedPlace(2, '퍼머넌트해비탯'), parsedPlace(3, '탐석과 사랑')]),
    );

    renderDetail();

    expect(await screen.findByText('게시물에 포함된 장소')).toBeInTheDocument();
    expect(await screen.findByText('퍼머넌트해비탯')).toBeInTheDocument();
    expect(screen.getByText('탐석과 사랑')).toBeInTheDocument();
    // 현재 보고 있는 장소(아이소)는 제목에만 있고 게시물에 포함된 장소 행으로는 나오지 않는다.
    expect(screen.getAllByText('아이소')).toHaveLength(1);
    expect(screen.getAllByText('퍼머넌트해비탯')).toHaveLength(1);
  });

  it('게시물에 포함된 장소 행을 누르면 그 장소 id 로 선택을 옮긴다', async () => {
    mocks.fetchPostDetail.mockResolvedValue(postDetail([parsedPlace(2, '퍼머넌트해비탯')]));
    const onSelectPlace = vi.fn();

    renderDetail(onSelectPlace);

    fireEvent.click(await screen.findByText('퍼머넌트해비탯'));
    expect(onSelectPlace).toHaveBeenCalledWith(2);
  });

  it('저장된 게시물의 아카이브 태그를 누르면 그 아카이브 상세로 이동한다', async () => {
    mocks.fetchPostDetail.mockResolvedValue(
      postDetail([parsedPlace(1, '아이소')], [{ id: 7, name: '카페', color: 'yellow' }]),
    );

    renderDetail(undefined, { ...PLACE, posts: [PLACE.posts[0] as PlaceDetailPost] });

    fireEvent.click(await screen.findByRole('button', { name: '카페' }));
    expect(screen.getByText('아카이브 상세 화면')).toBeInTheDocument();
  });

  it('게시물에 포함된 장소가 없으면 섹션 자체를 그리지 않는다', async () => {
    mocks.fetchPostDetail.mockResolvedValue(postDetail([parsedPlace(1, '아이소')]));

    renderDetail();

    expect(await screen.findByText('아이소')).toBeInTheDocument();
    expect(screen.queryByText('게시물에 포함된 장소')).not.toBeInTheDocument();
  });
});

describe('PlaceDetail 장소 메모', () => {
  beforeEach(() => {
    mocks.fetchPostDetail.mockResolvedValue(postDetail([]));
    mocks.updatePlaceMemo.mockClear();
  });

  it('메모가 없으면 "수정" 없이 안내 문구를 눌러 메모 시트를 열고 저장한다', async () => {
    renderDetail();

    expect(screen.queryByRole('button', { name: '수정' })).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: '메모를 남겨보세요' }));

    const input = screen.getByPlaceholderText('추가로 메모하고 싶은 내용이 있나요?');
    fireEvent.change(input, { target: { value: '주말엔 웨이팅 김' } });
    fireEvent.click(screen.getByRole('button', { name: '저장하기' }));

    await waitFor(() => expect(mocks.updatePlaceMemo).toHaveBeenCalledWith(1, '주말엔 웨이팅 김'));
  });

  it('메모가 있으면 "수정"으로 같은 시트를 현재 값과 함께 연다', async () => {
    renderDetail(undefined, { ...PLACE, memo: '창가 자리 좋음' });

    expect(await screen.findByText('창가 자리 좋음')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '수정' }));

    expect(screen.getByPlaceholderText('추가로 메모하고 싶은 내용이 있나요?')).toHaveValue(
      '창가 자리 좋음',
    );
  });
});

describe('PlaceDetail 장소 삭제', () => {
  it('삭제 버튼만으로는 지워지지 않고 확인 모달을 거친다', async () => {
    mocks.fetchPostDetail.mockResolvedValue(postDetail([parsedPlace(2, '퍼머넌트해비탯')]));

    renderDetail();

    fireEvent.click(await screen.findByRole('button', { name: '퍼머넌트해비탯 삭제' }));
    expect(screen.getByText('장소를 삭제하시겠어요?')).toBeInTheDocument();
    // 모달이 떠 있는 동안에는 아직 목록에 남아 있다.
    expect(screen.getByText('퍼머넌트해비탯')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(screen.getByText('퍼머넌트해비탯')).toBeInTheDocument();
  });

  it('확인하면 목록에서 사라지고 유예 뒤 그 장소를 담은 게시물마다 연결을 끊는다', async () => {
    mocks.disconnectPostPlace.mockClear();
    mocks.fetchPostDetail.mockImplementation(async (postId: number) =>
      postId === 11
        ? postDetail([parsedPlace(2, '퍼머넌트해비탯')])
        : postDetail([parsedPlace(2, '퍼머넌트해비탯')]),
    );

    renderDetail();

    fireEvent.click(await screen.findByRole('button', { name: '퍼머넌트해비탯 삭제' }));
    fireEvent.click(screen.getByRole('button', { name: '삭제하기' }));

    expect(mocks.disconnectPostPlace).not.toHaveBeenCalled();

    // 두 게시물(11·12)이 같은 장소를 가리키므로 각각 연결을 끊는다.
    await waitFor(
      () => {
        expect(mocks.disconnectPostPlace).toHaveBeenCalledWith(11, 2);
        expect(mocks.disconnectPostPlace).toHaveBeenCalledWith(12, 2);
      },
      { timeout: 5000 },
    );
  });

  it('확인하면 목록에서 사라지고, 실행취소하면 되돌아온다', async () => {
    mocks.disconnectPostPlace.mockClear();
    mocks.fetchPostDetail.mockResolvedValue(
      postDetail([parsedPlace(2, '퍼머넌트해비탯'), parsedPlace(3, '탐석과 사랑')]),
    );

    renderDetail();

    fireEvent.click(await screen.findByRole('button', { name: '퍼머넌트해비탯 삭제' }));
    fireEvent.click(screen.getByRole('button', { name: '삭제하기' }));

    expect(screen.queryByText('퍼머넌트해비탯')).not.toBeInTheDocument();
    // 같은 섹션의 다른 장소는 그대로 남는다.
    expect(screen.getByText('탐석과 사랑')).toBeInTheDocument();
    expect(screen.getByText('장소가 삭제 됐어요.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '실행취소' }));
    expect(screen.getByText('퍼머넌트해비탯')).toBeInTheDocument();
    expect(mocks.disconnectPostPlace).not.toHaveBeenCalled();
  });

  it('마지막 장소까지 지우면 섹션이 사라진다', async () => {
    mocks.fetchPostDetail.mockResolvedValue(postDetail([parsedPlace(2, '퍼머넌트해비탯')]));

    renderDetail();

    fireEvent.click(await screen.findByRole('button', { name: '퍼머넌트해비탯 삭제' }));
    fireEvent.click(screen.getByRole('button', { name: '삭제하기' }));

    expect(screen.queryByText('게시물에 포함된 장소')).not.toBeInTheDocument();
  });
});

describe('PlaceDetail 지도 링크', () => {
  it('"지도"는 주소+상호로 검색한 네이버 지도를 새 탭에 연다', async () => {
    mocks.fetchPostDetail.mockResolvedValue(postDetail([]));

    renderDetail();

    const link = await screen.findByRole('link', { name: '지도' });
    expect(link).toHaveAttribute(
      'href',
      `https://map.naver.com/p/search/${encodeURIComponent('서울 어딘가 아이소')}`,
    );
    expect(link).toHaveAttribute('target', '_blank');
  });
});

describe('PlaceDetail 저장된 게시물', () => {
  beforeEach(() => {
    mocks.fetchPostDetail.mockResolvedValue(postDetail([parsedPlace(1, '아이소')]));
  });

  it('게시물이 여러 건이면 제목·개수·화살표 어디를 눌러도 게시물 목록 페이지로 간다', async () => {
    renderDetail();

    const header = await screen.findByRole('button', { name: /저장된 게시물/ });
    expect(header).toHaveTextContent('2');

    fireEvent.click(header);
    expect(screen.getByText('저장된 게시물 목록 화면')).toBeInTheDocument();
  });

  it('게시물이 한 건이면 목록 페이지로 가는 헤더 없이 카드를 그대로 펼친다', async () => {
    renderDetail(undefined, { ...PLACE, posts: [PLACE.posts[0] as PlaceDetailPost] });

    expect(await screen.findByRole('heading', { name: '저장된 게시물' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /저장된 게시물/ })).not.toBeInTheDocument();
  });
});
