import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  fetchArchivePosts: vi.fn(),
  fetchArchivePlaces: vi.fn(),
}));

vi.mock('@/features/archive/api', () => mocks);

const { useArchivePosts, useArchivePlaces } = await import('@/features/archive/api/queries');

/** 처리가 끝난 뒤의 응답 — 캐시에 남은 'processing' 을 덮어써야 할 값. */
const DONE_POSTS = {
  posts: [{ id: 1, name: '초록뷰 카페', placeCount: 2, thumbnails: [] }],
  ownerNickname: 'purr',
  totalElements: 1,
};
const DONE_PLACES = { places: [{ id: 101, name: '아이소' }], totalElements: 1 };

/** 두 번의 진입이 같은 캐시를 보게 클라이언트를 공유한다 — 새로 만들면 검증 자체가 무의미해진다. */
let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  // 실제 앱과 같은 staleTime — 이 값이 없으면 재진입 재조회가 기본 동작에 묻혀 검증되지 않는다.
  queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: false } },
  });
  mocks.fetchArchivePosts.mockReset().mockResolvedValue(DONE_POSTS);
  mocks.fetchArchivePlaces.mockReset().mockResolvedValue(DONE_PLACES);
});

/**
 * 상세만 진입 시 재조회하면 "상세는 완료, 목록은 처리 중"이라는 반대 방향의 어긋남이 생긴다.
 * 목록의 폴링은 화면에 있는 동안만 도는지라, 떠나 있는 사이 끝난 처리는 재진입해도
 * 폴링 한 주기(3초) 동안 낡은 '처리 중' 카드로 남는다.
 */
describe('목록 진입 시 재조회', () => {
  it('staleTime 안에 다시 진입해도 게시물 목록을 한 번 더 읽는다', async () => {
    const first = renderHook(() => useArchivePosts(1), { wrapper });
    await waitFor(() => expect(mocks.fetchArchivePosts).toHaveBeenCalledTimes(1));
    first.unmount();

    renderHook(() => useArchivePosts(1), { wrapper });
    await waitFor(() => expect(mocks.fetchArchivePosts).toHaveBeenCalledTimes(2));
  });

  it('staleTime 안에 다시 진입해도 장소 목록을 한 번 더 읽는다', async () => {
    const first = renderHook(() => useArchivePlaces(1), { wrapper });
    await waitFor(() => expect(mocks.fetchArchivePlaces).toHaveBeenCalledTimes(1));
    first.unmount();

    renderHook(() => useArchivePlaces(1), { wrapper });
    await waitFor(() => expect(mocks.fetchArchivePlaces).toHaveBeenCalledTimes(2));
  });
});
