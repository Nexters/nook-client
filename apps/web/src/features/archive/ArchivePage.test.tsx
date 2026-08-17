import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BottomMenuVisibilityProvider } from '@/app/bottom-menu-visibility';
import { ArchiveDetailPage } from '@/features/archive/ArchiveDetailPage';
import { ArchiveFormPage } from '@/features/archive/ArchiveFormPage';
import { ArchivePage } from '@/features/archive/ArchivePage';
import type { Archive } from '@/features/archive/types';
import { ToastProvider } from '@/shared/toast';

const ARCHIVES: Archive[] = [
  { id: 1, name: '카페', color: 'yellow', placeCount: 114 },
  { id: 2, name: '독립영화관', color: 'blue', placeCount: 3 },
];

// HTTP 전송이 아니라 화면 ↔ Query ↔ feature API 배선만 검증한다.
const mocks = vi.hoisted(() => ({
  fetchArchives: vi.fn(),
  fetchArchivePosts: vi.fn(),
  fetchArchivePlaces: vi.fn(),
  createArchive: vi.fn(),
  updateArchive: vi.fn(),
  deleteArchive: vi.fn(),
  deleteArchivePosts: vi.fn(),
}));

vi.mock('@/features/archive/api', () => mocks);

function renderArchiveRoutes(initialPath: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const wrapper = (children: ReactNode) => (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BottomMenuVisibilityProvider value={{ hidden: false, setHidden: () => {} }}>
          {children}
        </BottomMenuVisibilityProvider>
      </ToastProvider>
    </QueryClientProvider>
  );

  return render(
    wrapper(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/archive" element={<ArchivePage />} />
          <Route path="/archive/new" element={<ArchiveFormPage mode="create" />} />
          <Route path="/archive/:archiveId" element={<ArchiveDetailPage />} />
          <Route path="/archive/:archiveId/edit" element={<ArchiveFormPage mode="edit" />} />
        </Routes>
      </MemoryRouter>,
    ),
  );
}

describe('아카이브 화면', () => {
  beforeEach(() => {
    mocks.fetchArchives.mockReset().mockResolvedValue(ARCHIVES);
    mocks.fetchArchivePosts
      .mockReset()
      .mockResolvedValue({ posts: [], nextPage: undefined, totalElements: 0 });
    mocks.fetchArchivePlaces
      .mockReset()
      .mockResolvedValue({ places: [], nextPage: undefined, totalElements: 0 });
    mocks.createArchive.mockReset().mockResolvedValue(undefined);
    mocks.updateArchive.mockReset().mockResolvedValue(undefined);
    mocks.deleteArchive.mockReset().mockResolvedValue(undefined);
    mocks.deleteArchivePosts.mockReset().mockResolvedValue(undefined);
  });

  it('목록에서 아카이브를 누르면 상세로 이동한다', async () => {
    renderArchiveRoutes('/archive');

    fireEvent.click(await screen.findByRole('button', { name: /카페/ }));

    expect(screen.getByRole('heading', { name: '카페' })).toBeInTheDocument();
  });

  it('새 아카이브 생성은 이름이 비면 버튼이 비활성화되고, 입력하면 생성 요청을 보낸다', async () => {
    renderArchiveRoutes('/archive/new');

    const submit = screen.getByRole('button', { name: '아카이브 만들기' });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText('아카이브 이름'), { target: { value: '토요일 모임' } });
    expect(submit).toBeEnabled();

    fireEvent.click(submit);
    // mutate 는 두 번째 인자로 mutation context 를 넘기므로 첫 인자만 본다.
    await vi.waitFor(() =>
      expect(mocks.createArchive.mock.calls[0]?.[0]).toEqual({
        name: '토요일 모임',
        color: 'yellow',
      }),
    );
  });

  it('아카이브 편집에서 이름과 색상을 바꿔 저장하면 수정 요청을 보낸다', async () => {
    renderArchiveRoutes('/archive/1/edit');

    const input = await screen.findByDisplayValue('카페');
    fireEvent.change(input, { target: { value: '동네 카페' } });
    fireEvent.click(screen.getByRole('button', { name: 'purple 아카이브 색상' }));
    fireEvent.click(screen.getByRole('button', { name: '저장하기' }));

    await vi.waitFor(() =>
      expect(mocks.updateArchive.mock.calls[0]?.[0]).toEqual({
        archiveId: 1,
        name: '동네 카페',
        color: 'purple',
      }),
    );
  });

  it('아카이브 상세는 저장된 게시물 목록과 소유자 닉네임을 그린다', async () => {
    mocks.fetchArchivePosts.mockResolvedValue({
      posts: [
        { id: 7, name: '초록뷰 카페', placeCount: 3, authorHandle: '@abcde', thumbnails: [] },
      ],
      nextPage: undefined,
      ownerNickname: 'Purr',
      totalElements: 12,
    });
    mocks.fetchArchivePlaces.mockResolvedValue({
      places: [],
      nextPage: undefined,
      totalElements: 114,
    });

    renderArchiveRoutes('/archive/1');

    expect(await screen.findByText('초록뷰 카페')).toBeInTheDocument();
    expect(mocks.fetchArchivePosts.mock.calls[0]?.[0]).toBe(1);
    expect(screen.getByText('by Purr')).toBeInTheDocument();
    // 소유자 닉네임은 아카이브 조회가 아니라 게시물 페이지 응답에서 온다.
    const card = screen.getByRole('button', { name: /초록뷰 카페/ });
    expect(within(card).getByText('@abcde')).toBeInTheDocument();
    expect(within(card).getByText('3 Places')).toBeInTheDocument();
    // 탭 카운트는 각 목록 응답의 totalElements 가 채운다.
    expect(screen.getByRole('tab', { name: /게시물/ })).toHaveTextContent('12');
    expect(screen.getByRole('tab', { name: /장소/ })).toHaveTextContent('114');
  });

  it('아카이브 상세 장소 탭을 누르면 저장된 장소 목록을 그린다', async () => {
    mocks.fetchArchivePosts.mockResolvedValue({
      posts: [
        { id: 7, name: '초록뷰 카페', placeCount: 3, authorHandle: '@abcde', thumbnails: [] },
      ],
      nextPage: undefined,
      ownerNickname: 'Purr',
      totalElements: 1,
    });
    mocks.fetchArchivePlaces.mockResolvedValue({
      places: [{ id: '42', name: '을지다락', category: '카페', region: '서울' }],
      nextPage: undefined,
      totalElements: 1,
    });

    renderArchiveRoutes('/archive/1');

    fireEvent.click(await screen.findByRole('tab', { name: /장소/ }));

    expect(await screen.findByText('을지다락')).toBeInTheDocument();
    // 장소 카드는 게시물 카드와 같은 그리드에 놓이는 세로형(PlaceCard) — 지역·업종을 보여준다.
    expect(screen.getByText('서울 • 카페')).toBeInTheDocument();
    expect(mocks.fetchArchivePlaces.mock.calls[0]?.[0]).toBe(1);
  });

  it('아카이브 상세에 게시물이 없으면 탭 없이 빈 상태를 보여준다', async () => {
    renderArchiveRoutes('/archive/1');

    expect(await screen.findByText('저장한 게시물이 없어요')).toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('상세 더보기 메뉴의 아카이브 편집을 누르면 편집 화면으로 이동한다', async () => {
    mocks.fetchArchivePosts.mockResolvedValue({
      posts: [
        { id: 7, name: '초록뷰 카페', placeCount: 3, authorHandle: '@abcde', thumbnails: [] },
      ],
      nextPage: undefined,
      ownerNickname: 'Purr',
      totalElements: 1,
    });

    renderArchiveRoutes('/archive/1');
    expect(await screen.findByText('초록뷰 카페')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '더보기' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '아카이브 편집' }));

    expect(await screen.findByDisplayValue('카페')).toBeInTheDocument();
  });

  it('상세 더보기 메뉴의 아카이브 삭제는 확인 팝업을 거쳐 삭제 요청을 보낸다', async () => {
    mocks.fetchArchivePosts.mockResolvedValue({
      posts: [
        { id: 7, name: '초록뷰 카페', placeCount: 3, authorHandle: '@abcde', thumbnails: [] },
      ],
      nextPage: undefined,
      ownerNickname: 'Purr',
      totalElements: 1,
    });

    renderArchiveRoutes('/archive/1');
    expect(await screen.findByText('초록뷰 카페')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '더보기' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '아카이브 삭제' }));
    expect(screen.getByText('아카이브를 삭제하시겠어요?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '삭제하기' }));
    await vi.waitFor(() => expect(mocks.deleteArchive.mock.calls[0]?.[0]).toBe(1));
    // 목록으로 돌아간 뒤에도 무엇을 지웠는지 이름으로 알려준다.
    expect(await screen.findByText('"카페" 아카이브가 삭제 됐어요.')).toBeInTheDocument();
  });

  it('선택 삭제는 고른 게시물을 확인 팝업을 거쳐 일괄 삭제 요청으로 보낸다', async () => {
    mocks.fetchArchivePosts.mockResolvedValue({
      posts: [
        { id: 7, name: '초록뷰 카페', placeCount: 3, thumbnails: [] },
        { id: 8, name: '을지로 카페', placeCount: 2, thumbnails: [] },
      ],
      nextPage: undefined,
      ownerNickname: 'Purr',
      totalElements: 2,
    });

    renderArchiveRoutes('/archive/1');
    expect(await screen.findByText('초록뷰 카페')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '더보기' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '선택 삭제' }));

    // 아무것도 고르지 않은 동안은 삭제 버튼이 비활성이다.
    expect(screen.getByRole('button', { name: '삭제하기' })).toBeDisabled();

    // 선택 모드에서 카드 탭은 상세 이동이 아니라 선택 토글이다.
    fireEvent.click(screen.getByRole('button', { name: /초록뷰 카페/ }));
    fireEvent.click(screen.getByRole('button', { name: /을지로 카페/ }));

    fireEvent.click(screen.getByRole('button', { name: '2개 삭제하기' }));
    expect(screen.getByText('2개 게시물을 삭제하시겠어요?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '삭제하기' }));
    await vi.waitFor(() => expect(mocks.deleteArchivePosts.mock.calls[0]?.[0]).toEqual([7, 8]));
  });

  it('장소 탭에서는 선택 삭제 메뉴가 없다 — 장소는 여기서 지울 수 없다', async () => {
    mocks.fetchArchivePosts.mockResolvedValue({
      posts: [{ id: 7, name: '초록뷰 카페', placeCount: 3, thumbnails: [] }],
      nextPage: undefined,
      ownerNickname: 'Purr',
      totalElements: 1,
    });
    mocks.fetchArchivePlaces.mockResolvedValue({
      places: [{ id: '42', name: '을지다락', category: '카페', region: '서울' }],
      nextPage: undefined,
      totalElements: 1,
    });

    renderArchiveRoutes('/archive/1');

    // 게시물 탭에서는 있다.
    fireEvent.click(await screen.findByRole('button', { name: '더보기' }));
    expect(screen.getByRole('menuitem', { name: '선택 삭제' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });

    fireEvent.click(screen.getByRole('tab', { name: /장소/ }));
    expect(await screen.findByText('을지다락')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '더보기' }));
    expect(screen.queryByRole('menuitem', { name: '선택 삭제' })).not.toBeInTheDocument();
    // 아카이브 편집·삭제는 그대로 있다.
    expect(screen.getByRole('menuitem', { name: '아카이브 삭제' })).toBeInTheDocument();
  });

  it('선택 모드에서 장소 탭으로 넘어가면 선택 모드가 끝난다', async () => {
    mocks.fetchArchivePosts.mockResolvedValue({
      posts: [{ id: 7, name: '초록뷰 카페', placeCount: 3, thumbnails: [] }],
      nextPage: undefined,
      ownerNickname: 'Purr',
      totalElements: 1,
    });

    renderArchiveRoutes('/archive/1');
    expect(await screen.findByText('초록뷰 카페')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '더보기' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '선택 삭제' }));
    expect(screen.getByRole('button', { name: '삭제하기' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /장소/ }));

    expect(screen.queryByRole('button', { name: '삭제하기' })).not.toBeInTheDocument();
  });

  it('선택 삭제 모드에서 뒤로가기는 페이지를 떠나지 않고 모드만 종료한다', async () => {
    mocks.fetchArchivePosts.mockResolvedValue({
      posts: [
        { id: 7, name: '초록뷰 카페', placeCount: 3, authorHandle: '@abcde', thumbnails: [] },
      ],
      nextPage: undefined,
      ownerNickname: 'Purr',
      totalElements: 1,
    });

    renderArchiveRoutes('/archive/1');
    expect(await screen.findByText('초록뷰 카페')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '더보기' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '선택 삭제' }));
    expect(screen.getByRole('button', { name: '삭제하기' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));

    expect(screen.queryByRole('button', { name: '삭제하기' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '카페' })).toBeInTheDocument();
    expect(mocks.deleteArchivePosts).not.toHaveBeenCalled();
  });

  it('아카이브 편집은 기존 이름을 채우고 삭제 확인 후 삭제 요청을 보낸다', async () => {
    renderArchiveRoutes('/archive/1/edit');

    expect(await screen.findByDisplayValue('카페')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '아카이브 삭제' }));
    expect(screen.getByText('아카이브를 삭제하시겠어요?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '삭제하기' }));
    await vi.waitFor(() => expect(mocks.deleteArchive.mock.calls[0]?.[0]).toBe(1));
    expect(await screen.findByText('"카페" 아카이브가 삭제 됐어요.')).toBeInTheDocument();
  });
});
