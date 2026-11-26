import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PostDetail } from '@/features/post/types';
import { ApiClientError } from '@/shared/api';
import { ToastProvider } from '@/shared/toast';
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

function PostProbe() {
  const { state } = useLocation();
  return <div>내 게시물 상세 {JSON.stringify(state)}</div>;
}

function renderPage(initialEntries: string[] = ['/shared-post/ptok']) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="/shared-post/:token" element={<SharedPostSharePage />} />
            <Route path="/post/:postId" element={<PostProbe />} />
            <Route path="/before" element={<div>이전 화면</div>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('SharedPostSharePage', () => {
  beforeEach(() => {
    session.status = 'anonymous';
    mocks.fetchPostShare.mockReset().mockResolvedValue(DETAIL);
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
    fireEvent.click(await screen.findByRole('button', { name: /아카이브에 저장/ }));
    expect(screen.getByText('로그인하시겠어요?')).toBeInTheDocument();
  });

  it('로그인 저장은 고른 아카이브로 스냅샷을 복사하고 내 게시물 상세로 전환한다', async () => {
    session.status = 'authenticated';
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /아카이브에 저장/ }));
    fireEvent.click(await screen.findByText('카페'));
    fireEvent.click(screen.getByRole('button', { name: '저장하기' }));

    // 링크로 곧장 들어온 첫 화면이었다 — 상세에 돌아갈 곳이 없다고 알린다(NOOK-449).
    expect(await screen.findByText(/내 게시물 상세 \{"postNoHistory":true\}/)).toBeInTheDocument();
    expect(mocks.savePostShare.mock.calls[0]?.[0]).toEqual({
      token: 'ptok',
      groupIds: [1],
      memo: undefined,
    });
    expect(await screen.findByText('"카페"에 저장됐어요.')).toBeInTheDocument();
  });

  it('같은 원본을 이미 저장했으면 공유 화면에 내 저장 아카이브를 보여준다', async () => {
    session.status = 'authenticated';
    mocks.fetchPostShare.mockResolvedValue({
      ...DETAIL,
      archives: [
        { id: 3, name: '서울 카페', color: 'yellow' },
        { id: 4, name: '주말', color: 'cement' },
      ],
    });
    renderPage();
    expect(await screen.findByText('서울 카페')).toBeInTheDocument();
    expect(screen.getByText('외 1곳에 저장')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /아카이브에 저장/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/내 게시물 상세/)).not.toBeInTheDocument();
  });

  it('앞 화면이 있는 채로 저장하면 상세는 평소처럼 히스토리로 돌아간다', async () => {
    session.status = 'authenticated';
    renderPage(['/before', '/shared-post/ptok']);
    fireEvent.click(await screen.findByRole('button', { name: /아카이브에 저장/ }));
    fireEvent.click(await screen.findByText('카페'));
    fireEvent.click(screen.getByRole('button', { name: '저장하기' }));
    expect(await screen.findByText(/내 게시물 상세/)).toHaveTextContent('내 게시물 상세 null');
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
