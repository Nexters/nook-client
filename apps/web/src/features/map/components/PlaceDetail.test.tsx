import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { PlaceDetail as PlaceDetailModel } from '@/features/map/types';
import type { ParsedPlace, PostDetail } from '@/features/post/types';
import { ToastProvider } from '@/shared/toast';

// HTTP 전송이 아니라 "게시물 상세의 places → 게시물에 포함된 장소 섹션" 배선만 검증한다.
const mocks = vi.hoisted(() => ({ fetchPostDetail: vi.fn() }));
vi.mock('@/features/post/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/post/api')>()),
  ...mocks,
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

function postDetail(places: ParsedPlace[], groups: PostDetail['groups'] = []): PostDetail {
  return {
    processingStatus: 'COMPLETED',
    processingPercent: 100,
    title: '게시물',
    groups,
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
            <Route path="/group/:groupId" element={<p>그룹 상세 화면</p>} />
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

  it('저장된 게시물의 그룹 태그를 누르면 그 그룹 상세로 이동한다', async () => {
    // 그룹 태그는 게시물 11 에만 달아 버튼이 하나만 나오게 한다.
    mocks.fetchPostDetail.mockImplementation(async (postId: number) =>
      postId === 11
        ? postDetail([parsedPlace(1, '아이소')], [{ id: 7, name: '카페', color: 'yellow' }])
        : postDetail([parsedPlace(1, '아이소')]),
    );

    renderDetail();

    fireEvent.click(await screen.findByRole('button', { name: '카페' }));
    expect(screen.getByText('그룹 상세 화면')).toBeInTheDocument();
  });

  it('게시물에 포함된 장소가 없으면 섹션 자체를 그리지 않는다', async () => {
    mocks.fetchPostDetail.mockResolvedValue(postDetail([parsedPlace(1, '아이소')]));

    renderDetail();

    expect(await screen.findByText('아이소')).toBeInTheDocument();
    expect(screen.queryByText('게시물에 포함된 장소')).not.toBeInTheDocument();
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

  it('확인하면 목록에서 사라지고, 실행취소하면 되돌아온다', async () => {
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
  });

  it('마지막 장소까지 지우면 섹션이 사라진다', async () => {
    mocks.fetchPostDetail.mockResolvedValue(postDetail([parsedPlace(2, '퍼머넌트해비탯')]));

    renderDetail();

    fireEvent.click(await screen.findByRole('button', { name: '퍼머넌트해비탯 삭제' }));
    fireEvent.click(screen.getByRole('button', { name: '삭제하기' }));

    expect(screen.queryByText('게시물에 포함된 장소')).not.toBeInTheDocument();
  });
});
