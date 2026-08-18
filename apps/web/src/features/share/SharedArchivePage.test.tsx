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
}));

// 로그인 상태에서만 도는 내 아카이브 목록 조회 — 이 테스트에서는 비어 있으면 된다.
vi.mock('@/features/archive/api', () => ({ fetchArchives: vi.fn().mockResolvedValue([]) }));

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
});
