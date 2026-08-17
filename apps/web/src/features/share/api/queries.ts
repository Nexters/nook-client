import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { archiveQueryKeys } from '@/features/archive/api/queries';
import {
  fetchSharedArchive,
  fetchSharedArchivePlaces,
  fetchSharedArchivePosts,
  subscribeSharedArchive,
} from '.';

export const sharedQueryKeys = {
  meta: (token: string) => ['shared', token] as const,
  posts: (token: string) => ['shared', token, 'posts'] as const,
  places: (token: string) => ['shared', token, 'places'] as const,
};

/** 공유 아카이브 메타 — 잘못된/해제된 토큰이면 에러로 떨어진다(화면이 코드별 안내를 그린다). */
export function useSharedArchive(token: string) {
  return useQuery({
    queryKey: sharedQueryKeys.meta(token),
    queryFn: () => fetchSharedArchive(token),
    // 해제·만료 링크는 재시도해도 결과가 같다 — 안내 화면을 바로 보여준다.
    retry: false,
  });
}

export function useSharedArchivePosts(token: string) {
  return useInfiniteQuery({
    queryKey: sharedQueryKeys.posts(token),
    queryFn: ({ pageParam }) => fetchSharedArchivePosts(token, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    select: (data) => ({
      posts: data.pages.flatMap((page) => page.posts),
      totalElements: data.pages[0]?.totalElements ?? 0,
    }),
  });
}

export function useSharedArchivePlaces(token: string) {
  return useInfiniteQuery({
    queryKey: sharedQueryKeys.places(token),
    queryFn: ({ pageParam }) => fetchSharedArchivePlaces(token, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    select: (data) => ({
      places: data.pages.flatMap((page) => page.places),
      totalElements: data.pages[0]?.totalElements ?? 0,
    }),
  });
}

export function useSubscribeSharedArchive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: subscribeSharedArchive,
    // 내 목록에 SHARED 카드가 새로 생긴다 — 프리픽스 무효화로 목록·상세 캐시 갱신.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: archiveQueryKeys.list }),
  });
}
