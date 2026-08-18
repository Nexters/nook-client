import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Archive } from '@/features/archive/types';
import { AwaitSession } from '@/features/auth/session/AuthRouteGuards';
import { ApiClientError } from '@/shared/api';
import { ToastProvider } from '@/shared/toast';
import { SharedArchivePage } from './SharedArchivePage';

const mocks = vi.hoisted(() => ({
  fetchSharedArchive: vi.fn(),
  fetchSharedArchivePosts: vi.fn(),
  fetchSharedArchivePlaces: vi.fn(),
  fetchSharedPlaceDetail: vi.fn(),
  subscribeSharedArchive: vi.fn(),
}));
vi.mock('@/features/share/api', () => mocks);

type SessionStatus = 'anonymous' | 'authenticated' | 'bootstrapping';
const session = vi.hoisted(() => ({ status: 'anonymous' as SessionStatus }));
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

function renderPage(token = 'tok-123', options: { withAwaitSession?: boolean } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = (children: ReactNode) => (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
  // 실제 라우터(`router.tsx`)와 동일하게 `AwaitSession` 으로 감싼다 — 부트스트래핑
  // 동안 렌더를 미루는지 확인하는 테스트에서만 켠다.
  const element = options.withAwaitSession ? (
    <AwaitSession>
      <SharedArchivePage />
    </AwaitSession>
  ) : (
    <SharedArchivePage />
  );
  return render(
    wrapper(
      <MemoryRouter initialEntries={[`/shared/${token}`]}>
        <Routes>
          <Route path="/shared/:token" element={element} />
          <Route path="/shared/:token/post/:postId" element={<div>공유 게시물 상세</div>} />
          <Route path="/login" element={<div>로그인 화면</div>} />
          <Route path="/map" element={<div>지도 화면</div>} />
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
    mocks.fetchSharedPlaceDetail.mockReset();
    archivesMock.mockReset().mockResolvedValue([]);
  });

  it('비로그인으로 아카이브 이름·소유자·게시물 목록을 그린다', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: '카페' })).toBeInTheDocument();
    expect(screen.getByText('by ehoidi')).toBeInTheDocument();
    expect(screen.getByText('지금 가기 좋은 초록뷰 카페')).toBeInTheDocument();
  });

  it('게시물 카드를 누르면 같은 토큰의 공유 게시물 상세로 이동한다', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /지금 가기 좋은 초록뷰 카페/ }));
    expect(await screen.findByText('공유 게시물 상세')).toBeInTheDocument();
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

  it('돌아갈 히스토리가 없으면 뒤로 가기가 지도로 보낸다', async () => {
    // MemoryRouter 의 첫 진입(단일 initialEntries)은 key === 'default' 다 — 공유
    // 딥링크로 앱을 처음 연 상황과 같다.
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: '뒤로 가기' }));
    expect(await screen.findByText('지도 화면')).toBeInTheDocument();
  });

  it('세션 복구 중(AwaitSession)에는 화면을 그리지 않고 조회도 하지 않는다', async () => {
    session.status = 'bootstrapping';
    renderPage('tok-123', { withAwaitSession: true });

    expect(screen.queryByRole('heading', { name: '카페' })).not.toBeInTheDocument();
    // 부트스트래핑 동안은 AwaitSession 이 렌더 자체를 미루므로 쿼리도 아직 나가지 않는다.
    expect(mocks.fetchSharedArchive).not.toHaveBeenCalled();
    expect(archivesMock).not.toHaveBeenCalled();
  });

  it('공유 버튼을 누르면 공유 시트가 열리고 프리뷰 카드에 아카이브 정보를 보여준다', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: '공유' }));

    // 프리뷰 카드 — 아카이브 이름과 소유자, 개수 요약.
    // 유일한 텍스트는 "@ehoidi • 12 Places" 이므로 이것으로 프리뷰 카드 렌더 여부를 확인한다.
    expect(screen.getByText('@ehoidi • 12 Places')).toBeInTheDocument();
    // 공유 수단.
    expect(screen.getByText('링크 복사')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '더보기' })).toBeInTheDocument();
  });

  it('비로그인 장소 카드 탭은 로그인 월을 띄운다', async () => {
    mocks.fetchSharedArchivePlaces.mockResolvedValue({
      places: [{ id: '42', name: '을지다락', category: '카페', region: '서울' }],
      nextPage: undefined,
      totalElements: 1,
    });
    renderPage();
    fireEvent.click(await screen.findByRole('tab', { name: /장소/ }));
    fireEvent.click(await screen.findByText('을지다락'));
    expect(screen.getByText('로그인하시겠어요?')).toBeInTheDocument();
  });

  it('로그인 장소 카드 탭은 공유 장소 시트를 연다', async () => {
    session.status = 'authenticated';
    mocks.fetchSharedArchivePlaces.mockResolvedValue({
      places: [{ id: '42', name: '을지다락', category: '카페', region: '서울' }],
      nextPage: undefined,
      totalElements: 1,
    });
    mocks.fetchSharedPlaceDetail.mockResolvedValue({
      id: 42,
      name: '을지다락',
      address: '서울 중구 을지로',
      lat: 37.5,
      lng: 127.0,
      bookmarked: false,
      photos: [],
      tags: [],
      posts: [],
    });
    renderPage();
    fireEvent.click(await screen.findByRole('tab', { name: /장소/ }));
    fireEvent.click(await screen.findByText('을지다락'));

    expect(await screen.findByText('서울 중구 을지로')).toBeInTheDocument();
    expect(mocks.fetchSharedPlaceDetail).toHaveBeenCalledWith('tok-123', 42);
  });

  it('공유 장소 시트의 저장한 게시물 타일을 누르면 같은 토큰의 공유 게시물 상세로 이동한다', async () => {
    session.status = 'authenticated';
    mocks.fetchSharedArchivePlaces.mockResolvedValue({
      places: [{ id: '42', name: '을지다락', category: '카페', region: '서울' }],
      nextPage: undefined,
      totalElements: 1,
    });
    mocks.fetchSharedPlaceDetail.mockResolvedValue({
      id: 42,
      name: '을지다락',
      address: '서울 중구 을지로',
      lat: 37.5,
      lng: 127.0,
      bookmarked: false,
      photos: [],
      tags: [],
      posts: [{ id: 5, title: '초록뷰 카페', savedAt: '2026-08-20T00:00:00Z' }],
    });
    renderPage();
    fireEvent.click(await screen.findByRole('tab', { name: /장소/ }));
    fireEvent.click(await screen.findByText('을지다락'));

    fireEvent.click(await screen.findByText('초록뷰 카페'));
    expect(await screen.findByText('공유 게시물 상세')).toBeInTheDocument();
  });
});
