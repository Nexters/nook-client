import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PostDetail } from '@/features/post/types';
import { ToastProvider } from '@/shared/toast';
import { SharedPostDetailPage } from './SharedPostDetailPage';

const mocks = vi.hoisted(() => ({
  fetchSharedPostDetail: vi.fn(),
  saveSharedPost: vi.fn(),
}));
vi.mock('@/features/share/api', () => mocks);

const session = vi.hoisted(() => ({ status: 'anonymous' as 'anonymous' | 'authenticated' }));
vi.mock('@/features/auth/session/AuthSessionProvider', () => ({
  useAuthSession: () => ({ status: session.status }),
  useIsAuthenticated: () => session.status === 'authenticated',
}));

const archivesMock = vi.hoisted(() => vi.fn());
vi.mock('@/features/archive/api', () => ({ fetchArchives: archivesMock }));

const DETAIL: PostDetail = {
  post: {
    id: '5',
    authorHandle: '@nook.official',
    caption: '초록뷰가 아름다운 카페',
    images: [],
    originalUrl: 'https://instagram.com/p/x',
  },
  processingStatus: 'COMPLETED',
  processingPercent: 100,
  title: '지금 가기 좋은 초록뷰 카페',
  archives: [],
  memo: '지우랑 가면 좋겠다',
  places: [],
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/shared/tok-123/post/5']}>
          <Routes>
            <Route path="/shared/:token/post/:postId" element={<SharedPostDetailPage />} />
            <Route path="/post/:postId" element={<div>내 게시물 상세</div>} />
            <Route path="/login" element={<div>로그인 화면</div>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('SharedPostDetailPage', () => {
  beforeEach(() => {
    session.status = 'anonymous';
    mocks.fetchSharedPostDetail.mockReset().mockResolvedValue(DETAIL);
    mocks.saveSharedPost.mockReset().mockResolvedValue(123);
    archivesMock
      .mockReset()
      .mockResolvedValue([
        { id: 1, name: '카페', color: 'yellow', placeCount: 3, accessType: 'OWNED' },
      ]);
  });

  it('공유자 메모를 읽기 전용으로 그린다 — 수정 버튼이 없다', async () => {
    renderPage();
    expect(await screen.findByText('지우랑 가면 좋겠다')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /수정/ })).not.toBeInTheDocument();
  });

  it('비로그인 저장 칩은 로그인 월을 띄운다', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /아카이브에 저장/ }));
    expect(screen.getByText('로그인하시겠어요?')).toBeInTheDocument();
  });

  it('로그인 저장은 시트에서 고른 아카이브로 저장하고 내 게시물 상세로 전환한다', async () => {
    session.status = 'authenticated';
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /아카이브에 저장/ }));
    fireEvent.click(await screen.findByText('카페'));
    fireEvent.click(screen.getByRole('button', { name: '저장하기' }));

    expect(await screen.findByText('내 게시물 상세')).toBeInTheDocument();
    expect(mocks.saveSharedPost.mock.calls[0]?.[0]).toEqual({
      shareToken: 'tok-123',
      sharedPostId: 5,
      groupIds: [1],
      memo: undefined,
    });
  });

  it('이미 저장한 게시물은 칩이 읽기 전용 표시다 — 시트가 열리지 않는다', async () => {
    session.status = 'authenticated';
    mocks.fetchSharedPostDetail.mockResolvedValue({
      ...DETAIL,
      archives: [{ id: 1, name: '카페', color: 'yellow' }],
    });
    renderPage();
    expect(await screen.findByText(/「카페」에 저장/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /아카이브에 저장/ })).not.toBeInTheDocument();
  });
});
