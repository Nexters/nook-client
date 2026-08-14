import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BottomMenuVisibilityProvider } from '@/app/bottom-menu-visibility';
import { GroupDetailPage } from '@/features/group/GroupDetailPage';
import { GroupFormPage } from '@/features/group/GroupFormPage';
import { GroupPage } from '@/features/group/GroupPage';
import type { Group } from '@/features/group/types';

const GROUPS: Group[] = [
  { id: 1, name: '카페', color: 'yellow', placeCount: 114 },
  { id: 2, name: '독립영화관', color: 'blue', placeCount: 3 },
];

// HTTP 전송이 아니라 화면 ↔ Query ↔ feature API 배선만 검증한다.
const mocks = vi.hoisted(() => ({
  fetchGroups: vi.fn(),
  fetchGroupPosts: vi.fn(),
  fetchGroupPlaces: vi.fn(),
  createGroup: vi.fn(),
  updateGroup: vi.fn(),
  deleteGroup: vi.fn(),
}));

vi.mock('@/features/group/api', () => mocks);

function renderGroupRoutes(initialPath: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const wrapper = (children: ReactNode) => (
    <QueryClientProvider client={queryClient}>
      <BottomMenuVisibilityProvider value={{ hidden: false, setHidden: () => {} }}>
        {children}
      </BottomMenuVisibilityProvider>
    </QueryClientProvider>
  );

  return render(
    wrapper(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/group" element={<GroupPage />} />
          <Route path="/group/new" element={<GroupFormPage mode="create" />} />
          <Route path="/group/:groupId" element={<GroupDetailPage />} />
          <Route path="/group/:groupId/edit" element={<GroupFormPage mode="edit" />} />
        </Routes>
      </MemoryRouter>,
    ),
  );
}

describe('그룹 화면', () => {
  beforeEach(() => {
    mocks.fetchGroups.mockReset().mockResolvedValue(GROUPS);
    mocks.fetchGroupPosts
      .mockReset()
      .mockResolvedValue({ posts: [], nextPage: undefined, totalElements: 0 });
    mocks.fetchGroupPlaces
      .mockReset()
      .mockResolvedValue({ places: [], nextPage: undefined, totalElements: 0 });
    mocks.createGroup.mockReset().mockResolvedValue(undefined);
    mocks.updateGroup.mockReset().mockResolvedValue(undefined);
    mocks.deleteGroup.mockReset().mockResolvedValue(undefined);
  });

  it('목록에서 그룹을 누르면 상세로 이동한다', async () => {
    renderGroupRoutes('/group');

    fireEvent.click(await screen.findByRole('button', { name: /카페/ }));

    expect(screen.getByRole('heading', { name: '카페' })).toBeInTheDocument();
  });

  it('새 그룹 생성은 이름이 비면 버튼이 비활성화되고, 입력하면 생성 요청을 보낸다', async () => {
    renderGroupRoutes('/group/new');

    const submit = screen.getByRole('button', { name: '그룹 만들기' });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText('그룹 이름'), { target: { value: '토요일 모임' } });
    expect(submit).toBeEnabled();

    fireEvent.click(submit);
    // mutate 는 두 번째 인자로 mutation context 를 넘기므로 첫 인자만 본다.
    await vi.waitFor(() =>
      expect(mocks.createGroup.mock.calls[0]?.[0]).toEqual({
        name: '토요일 모임',
        color: 'yellow',
      }),
    );
  });

  it('그룹 편집에서 이름과 색상을 바꿔 저장하면 수정 요청을 보낸다', async () => {
    renderGroupRoutes('/group/1/edit');

    const input = await screen.findByDisplayValue('카페');
    fireEvent.change(input, { target: { value: '동네 카페' } });
    fireEvent.click(screen.getByRole('button', { name: 'purple 그룹 색상' }));
    fireEvent.click(screen.getByRole('button', { name: '저장하기' }));

    await vi.waitFor(() =>
      expect(mocks.updateGroup.mock.calls[0]?.[0]).toEqual({
        groupId: 1,
        name: '동네 카페',
        color: 'purple',
      }),
    );
  });

  it('그룹 상세는 저장된 게시물 목록과 소유자 닉네임을 그린다', async () => {
    mocks.fetchGroupPosts.mockResolvedValue({
      posts: [
        { id: 7, name: '초록뷰 카페', placeCount: 3, authorHandle: '@abcde', thumbnails: [] },
      ],
      nextPage: undefined,
      ownerNickname: 'Purr',
      totalElements: 12,
    });
    mocks.fetchGroupPlaces.mockResolvedValue({
      places: [],
      nextPage: undefined,
      totalElements: 114,
    });

    renderGroupRoutes('/group/1');

    expect(await screen.findByText('초록뷰 카페')).toBeInTheDocument();
    expect(mocks.fetchGroupPosts.mock.calls[0]?.[0]).toBe(1);
    expect(screen.getByText('by Purr')).toBeInTheDocument();
    // 소유자 닉네임은 그룹 조회가 아니라 게시물 페이지 응답에서 온다.
    const card = screen.getByRole('button', { name: /초록뷰 카페/ });
    expect(within(card).getByText('@abcde')).toBeInTheDocument();
    expect(within(card).getByText('3 Places')).toBeInTheDocument();
    // 탭 카운트는 각 목록 응답의 totalElements 가 채운다.
    expect(screen.getByRole('tab', { name: /게시물/ })).toHaveTextContent('12');
    expect(screen.getByRole('tab', { name: /장소/ })).toHaveTextContent('114');
  });

  it('그룹 상세 장소 탭을 누르면 저장된 장소 목록을 그린다', async () => {
    mocks.fetchGroupPosts.mockResolvedValue({
      posts: [
        { id: 7, name: '초록뷰 카페', placeCount: 3, authorHandle: '@abcde', thumbnails: [] },
      ],
      nextPage: undefined,
      ownerNickname: 'Purr',
      totalElements: 1,
    });
    mocks.fetchGroupPlaces.mockResolvedValue({
      places: [{ id: '42', name: '을지다락', category: '카페', region: '서울' }],
      nextPage: undefined,
      totalElements: 1,
    });

    renderGroupRoutes('/group/1');

    fireEvent.click(await screen.findByRole('tab', { name: /장소/ }));

    expect(await screen.findByText('을지다락')).toBeInTheDocument();
    // 장소 카드는 게시물 카드와 같은 그리드에 놓이는 세로형(PlaceCard) — 지역·업종을 보여준다.
    expect(screen.getByText('서울 • 카페')).toBeInTheDocument();
    expect(mocks.fetchGroupPlaces.mock.calls[0]?.[0]).toBe(1);
  });

  it('그룹 상세에 게시물이 없으면 탭 없이 빈 상태를 보여준다', async () => {
    renderGroupRoutes('/group/1');

    expect(await screen.findByText('저장한 게시물이 없어요')).toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('상세 더보기 메뉴의 아카이브 편집을 누르면 편집 화면으로 이동한다', async () => {
    mocks.fetchGroupPosts.mockResolvedValue({
      posts: [
        { id: 7, name: '초록뷰 카페', placeCount: 3, authorHandle: '@abcde', thumbnails: [] },
      ],
      nextPage: undefined,
      ownerNickname: 'Purr',
      totalElements: 1,
    });

    renderGroupRoutes('/group/1');
    expect(await screen.findByText('초록뷰 카페')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '더보기' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '아카이브 편집' }));

    expect(await screen.findByDisplayValue('카페')).toBeInTheDocument();
  });

  it('상세 더보기 메뉴의 아카이브 삭제는 확인 팝업을 거쳐 삭제 요청을 보낸다', async () => {
    mocks.fetchGroupPosts.mockResolvedValue({
      posts: [
        { id: 7, name: '초록뷰 카페', placeCount: 3, authorHandle: '@abcde', thumbnails: [] },
      ],
      nextPage: undefined,
      ownerNickname: 'Purr',
      totalElements: 1,
    });

    renderGroupRoutes('/group/1');
    expect(await screen.findByText('초록뷰 카페')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '더보기' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '아카이브 삭제' }));
    expect(screen.getByText('아카이브를 삭제하시겠어요?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '삭제하기' }));
    await vi.waitFor(() => expect(mocks.deleteGroup.mock.calls[0]?.[0]).toBe(1));
  });

  it('그룹 편집은 기존 이름을 채우고 삭제 확인 후 삭제 요청을 보낸다', async () => {
    renderGroupRoutes('/group/1/edit');

    expect(await screen.findByDisplayValue('카페')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '그룹 삭제' }));
    expect(screen.getByText('그룹을 삭제하시겠어요?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '삭제하기' }));
    await vi.waitFor(() => expect(mocks.deleteGroup.mock.calls[0]?.[0]).toBe(1));
  });
});
