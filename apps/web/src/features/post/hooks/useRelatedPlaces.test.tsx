import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { useRelatedPlaces } from './useRelatedPlaces';

// 전역 queryClient(retry: 1)를 쓰면 에러 케이스가 재시도 때문에 느려진다 — 테스트는 재시도 없이 돈다.
function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useRelatedPlaces', () => {
  it('파싱 성공이면 장소 목록과 북마크된 장소 id 를 반환한다', async () => {
    const { result } = renderHook(() => useRelatedPlaces('post-1'), { wrapper: createWrapper() });

    expect(result.current.status).toBe('loading');

    await waitFor(() => expect(result.current.status).not.toBe('loading'));

    expect(result.current.status).toBe('success');
    if (result.current.status === 'success') {
      expect(result.current.places.map((place) => place.name)).toContain('아이소');
      expect(result.current.bookmarkedPlaceIds).toEqual(['1', '2']);
    }
  });

  it('매칭된 장소가 없으면 빈 목록으로 성공한다', async () => {
    const { result } = renderHook(() => useRelatedPlaces('post-2'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.status).not.toBe('loading'));

    expect(result.current).toEqual({ status: 'success', places: [], bookmarkedPlaceIds: [] });
  });

  it('파싱 상태가 FAILED 면 에러 상태를 반환한다', async () => {
    const { result } = renderHook(() => useRelatedPlaces('post-3'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.status).not.toBe('loading'));

    expect(result.current).toEqual({ status: 'error' });
  });

  it('요청 자체가 실패해도 에러 상태를 반환한다', async () => {
    const { result } = renderHook(() => useRelatedPlaces('unknown-post'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.status).not.toBe('loading'));

    expect(result.current).toEqual({ status: 'error' });
  });
});
