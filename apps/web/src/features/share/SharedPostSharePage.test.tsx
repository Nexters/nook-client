import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PostDetail } from '@/features/post/types';
import { ApiClientError } from '@/shared/api';
import { ToastProvider } from '@/shared/toast';
import type { PostShare } from './api';
import { SharedPostSharePage } from './SharedPostSharePage';

const mocks = vi.hoisted(() => ({
  fetchPostShare: vi.fn(),
  savePostShare: vi.fn(),
}));
vi.mock('@/features/share/api', () => mocks);

const session = vi.hoisted(() => ({ status: 'anonymous' as 'anonymous' | 'authenticated' }));
vi.mock('@/features/auth/session/AuthSessionProvider', () => ({
  useAuthSession: () => ({ status: session.status }),
  useIsAuthenticated: () => session.status === 'authenticated',
}));

vi.mock('@/features/archive/api', () => ({
  fetchArchives: () =>
    Promise.resolve([{ id: 1, name: '카페', color: 'yellow', placeCount: 3, accessType: 'OWNED' }]),
}));
vi.mock('@/features/my/api', () => ({
  fetchMyProfile: () => Promise.resolve({ nickname: 'Purr' }),
}));

const DETAIL: PostDetail = {
  post: {
    id: '',
    authorHandle: '@nook.official on instagram',
    caption: '초록뷰가 아름다운 카페',
    media: [],
    originalUrl: 'https://instagram.com/p/x',
  },
  processingStatus: 'COMPLETED',
  processingPercent: 100,
  title: '지금 가기 좋은 초록뷰 카페',
  archives: [],
  placeParsingStatus: 'COMPLETED',
  placeParsingFailureReason: null,
  places: [
    {
      id: 42,
      provider: 'kakao',
      externalPlaceId: 'ext-42',
      name: '아이소',
      address: '경기 용인시 은이로 72',
      latitude: 37.5,
      longitude: 127.0,
      category: '전시',
      phoneNumber: null,
      bookmarked: false,
      thumbnailParsingStatus: 'COMPLETED',
    },
  ],
};

const SHARE: PostShare = { detail: DETAIL, viewerSavedPostId: null };

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/shared-post/ptok']}>
          <Routes>
            <Route path="/shared-post/:token" element={<SharedPostSharePage />} />
            <Route path="/post/:postId" element={<div>내 게시물 상세</div>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('SharedPostSharePage', () => {
  beforeEach(() => {
    session.status = 'anonymous';
    mocks.fetchPostShare.mockReset().mockResolvedValue(SHARE);
    mocks.savePostShare.mockReset().mockResolvedValue(77);
  });

  it('스냅샷의 게시물과 포함된 장소를 그린다 — 저장 전이라 장소 행은 눌리지 않는다', async () => {
    renderPage();
    expect(
      await screen.findByRole('heading', { name: '지금 가기 좋은 초록뷰 카페' }),
    ).toBeInTheDocument();
    expect(screen.getByText('게시물에 포함된 장소')).toBeInTheDocument();
    expect(screen.getByText('아이소')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /아이소/ })).not.toBeInTheDocument();
  });

  it('비로그인 저장 칩은 로그인 월을 띄운다', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /아카이브 추가/ }));
    expect(screen.getByText('로그인하시겠어요?')).toBeInTheDocument();
  });

  it('로그인 저장은 고른 아카이브로 스냅샷을 복사하고 내 게시물 상세로 전환한다', async () => {
    session.status = 'authenticated';
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /아카이브 추가/ }));
    fireEvent.click(await screen.findByText('카페'));
    fireEvent.click(screen.getByRole('button', { name: '저장하기' }));

    expect(await screen.findByText('내 게시물 상세')).toBeInTheDocument();
    expect(mocks.savePostShare.mock.calls[0]?.[0]).toEqual({
      token: 'ptok',
      groupIds: [1],
      memo: undefined,
    });
    expect(await screen.findByText('"카페"에 저장됐어요.')).toBeInTheDocument();
  });

  it('이미 저장한 공유로 들어오면 내 게시물 상세로 보낸다', async () => {
    session.status = 'authenticated';
    mocks.fetchPostShare.mockResolvedValue({ ...SHARE, viewerSavedPostId: 9 });
    renderPage();
    expect(await screen.findByText('내 게시물 상세')).toBeInTheDocument();
  });

  it('원본이 삭제돼 만료된 링크면 안내 문구를 보여준다', async () => {
    mocks.fetchPostShare.mockRejectedValue(
      new ApiClientError('gone', { kind: 'http', code: 'POST_SHARE_EXPIRED' }),
    );
    renderPage();
    expect(await screen.findByText('원본 게시물이 삭제되어 볼 수 없어요.')).toBeInTheDocument();
  });

  it('더보기 > 게시물 공유는 받은 링크 그대로 공유 시트를 연다', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: '더보기', expanded: false }));
    fireEvent.click(screen.getByRole('menuitem', { name: '게시물 공유' }));
    const sheet = await screen.findByRole('dialog', { name: '게시물 공유' });
    expect(sheet).toHaveTextContent('지금 가기 좋은 초록뷰 카페');
    expect(sheet).toHaveTextContent('1 Places');
  });
});
