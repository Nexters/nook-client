import { QueryClient } from '@tanstack/react-query';

/**
 * 전역 Query 클라이언트.
 * "저장 → 비동기 분석 → 갱신" 플로우의 폴링/캐싱이 제품 본체이므로
 * 기본 정책을 보수적으로 두고, 폴링이 필요한 쿼리에서 개별 override 한다.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
