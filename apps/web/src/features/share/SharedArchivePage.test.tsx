import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Archive } from '@/features/archive/types';
import { ApiClientError } from '@/shared/api';
import { ToastProvider } from '@/shared/toast';
import { SharedArchivePage } from './SharedArchivePage';

const mocks = vi.hoisted(() => ({
  fetchSharedArchive: vi.fn(),
  fetchSharedArchivePosts: vi.fn(),
  fetchSharedArchivePlaces: vi.fn(),
  subscribeSharedArchive: vi.fn(),
}));
vi.mock('@/features/share/api', () => mocks);

const session = vi.hoisted(() => ({ status: 'anonymous' as 'anonymous' | 'authenticated' }));
vi.mock('@/features/auth/session/AuthSessionProvider', () => ({
  useAuthSession: () => ({ status: session.status }),
  useIsAuthenticated: () => session.status === 'authenticated',
}));

// 로그인 상태에서만 도는 내 아카이브 목록 조회 — 케이스별로 반환을 바꿀 수 있게 홀더로 승격.
const archivesMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));
vi.mock('@/features/archive/api', () => ({ fetchArchives: archivesMock }));

const META: Archive = {
  id: 27,
  name: '카페',
  color: 'cement',
  placeCount: 12,
  accessType: 'SHARED',
  owner: { nickname: 'ehoidi' },
  shareToken: 'tok-123',
};

function renderPage(token = 'tok-123') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = (children: ReactNode) => (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
  return render(
    wrapper(
      <MemoryRouter initialEntries={[`/shared/${token}`]}>
        <Routes>
          <Route path="/shared/:token" element={<SharedArchivePage />} />
          <Route path="/login" element={<div>로그인 화면</div>} />
        </Routes>
      </MemoryRouter>,
    ),
  );
}

describe('SharedArchivePage', () => {
  beforeEach(() => {
    session.status = 'anonymous';
    mocks.fetchSharedArchive.mockReset().mockResolvedValue(META);
    mocks.fetchSharedArchivePosts.mockReset().mockResolvedValue({
      posts: [{ id: 5, name: '지금 가기 좋은 초록뷰 카페', placeCount: 3 }],
      nextPage: undefined,
      ownerNickname: 'ehoidi',
      totalElements: 1,
    });
    mocks.fetchSharedArchivePlaces.mockReset().mockResolvedValue({
      places: [],
      nextPage: undefined,
      totalElements: 0,
    });
    mocks.subscribeSharedArchive.mockReset().mockResolvedValue(undefined);
    archivesMock.mockReset().mockResolvedValue([]);
  });

  it('비로그인으로 아카이브 이름·소유자·게시물 목록을 그린다', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: '카페' })).toBeInTheDocument();
    expect(screen.getByText('by ehoidi')).toBeInTheDocument();
    expect(screen.getByText('지금 가기 좋은 초록뷰 카페')).toBeInTheDocument();
  });

  it('장소 탭으로 전환하면 장소 목록 조회 결과를 그린다', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('tab', { name: /장소/ }));
    expect(await screen.findByText('저장한 장소가 없어요')).toBeInTheDocument();
  });

  it('해제된 링크는 코드별 안내 문구를 보여준다', async () => {
    mocks.fetchSharedArchive.mockRejectedValue(
      new ApiClientError('revoked', { kind: 'http', status: 410, code: 'SHARE_LINK_REVOKED' }),
    );
    renderPage();
    expect(await screen.findByText('공유가 해제된 아카이브예요.')).toBeInTheDocument();
  });

  it('비로그인 저장 탭은 로그인 월을 띄우고, 로그인하기를 누르면 로그인 화면으로 간다', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /아카이브에 저장/ }));
    expect(screen.getByText('로그인하시겠어요?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '로그인하기' }));
    expect(await screen.findByText('로그인 화면')).toBeInTheDocument();
  });

  it('로그인 상태의 저장 탭은 구독을 호출하고 완료 토스트를 띄운다', async () => {
    session.status = 'authenticated';
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /아카이브에 저장/ }));

    // TanStack Query v5 mutationFn 은 (variables, mutationFnContext) 두 인자로 불린다 —
    // 두 번째 인자는 신경 쓰지 않는다.
    await vi.waitFor(() =>
      expect(mocks.subscribeSharedArchive).toHaveBeenCalledWith('tok-123', expect.anything()),
    );
    expect(await screen.findByText('아카이브에 저장됐어요!')).toBeInTheDocument();
  });

  it('이미 내 목록에 있는 아카이브는 저장 버튼이 완료 상태다', async () => {
    session.status = 'authenticated';
    archivesMock.mockResolvedValue([{ ...META, accessType: 'SHARED' }]);
    renderPage();
    expect(await screen.findByRole('button', { name: /저장됨/ })).toBeDisabled();
  });
});
