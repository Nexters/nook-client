import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlaceParsingResult, PostDetail } from '@/features/post/types';

const mocks = vi.hoisted(() => ({
  fetchPostDetail: vi.fn(),
  fetchPlaceParsing: vi.fn(),
}));

vi.mock('@/features/post/api', () => mocks);

const { usePostDetail, useRelatedPlaces } = await import('@/features/post/api/queries');

const DETAIL: PostDetail = {
  processingStatus: 'COMPLETED',
  processingPercent: 100,
  places: [],
  placeParsingStatus: 'PENDING',
  placeParsingFailureReason: null,
  title: '지금 가기 좋은 초록뷰 카페',
  archives: [],
  post: {
    id: '1',
    authorHandle: '@nook.official on instagram',
    caption: '초록뷰가 아름다운 카페 공간',
    media: [],
    originalUrl: 'https://instagram.com',
  },
};

const PARSING: PlaceParsingResult = {
  postId: 1,
  placeParsingStatus: 'COMPLETED',
  failureReason: null,
  places: [],
};

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
  mocks.fetchPostDetail.mockReset().mockResolvedValue(DETAIL);
  mocks.fetchPlaceParsing.mockReset().mockResolvedValue(PARSING);
});

/**
 * 목록에서 완료로 보이는 게시물이 상세에서 미완료로 보이던 결함(NOOK-297).
 * staleTime 안에 재진입하면 캐시를 그대로 그린다 — 파싱 캐시가 PENDING 이면 기존 폴링이
 * 3초 뒤 회복하지만 그동안 미완료 화면이 뜨고, 이미 COMPLETED 인 캐시(그 뒤 장소가 늘거나
 * 썸네일이 붙은 경우)는 폴링이 돌지 않아 영영 낡은 채로 남는다.
 */
describe('상세 진입 시 재조회', () => {
  it('staleTime 안에 다시 진입해도 게시물 상세를 한 번 더 읽는다', async () => {
    const first = renderHook(() => usePostDetail(1), { wrapper });
    await waitFor(() => expect(mocks.fetchPostDetail).toHaveBeenCalledTimes(1));
    first.unmount();

    renderHook(() => usePostDetail(1), { wrapper });
    await waitFor(() => expect(mocks.fetchPostDetail).toHaveBeenCalledTimes(2));
  });

  it('staleTime 안에 다시 진입해도 장소 파싱 결과를 한 번 더 읽는다', async () => {
    const first = renderHook(() => useRelatedPlaces(1), { wrapper });
    await waitFor(() => expect(mocks.fetchPlaceParsing).toHaveBeenCalledTimes(1));
    first.unmount();

    renderHook(() => useRelatedPlaces(1), { wrapper });
    await waitFor(() => expect(mocks.fetchPlaceParsing).toHaveBeenCalledTimes(2));
  });
});
