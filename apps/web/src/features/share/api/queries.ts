import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { archiveQueryKeys } from '@/features/archive/api/queries';
import {
  fetchSharedArchive,
  fetchSharedArchivePlaces,
  fetchSharedArchivePosts,
  subscribeSharedArchive,
  fetchSharedPostDetail,
  fetchSharedPlaceDetail,
  saveSharedPost,
} from '.';

export const sharedQueryKeys = {
  meta: (token: string) => ['shared', token, 'meta'] as const,
  posts: (token: string) => ['shared', token, 'posts'] as const,
  places: (token: string) => ['shared', token, 'places'] as const,
  postDetail: (token: string, postId: number) => ['shared', token, 'posts', postId] as const,
  placeDetail: (token: string, placeId: number) => ['shared', token, 'places', placeId] as const,
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

export function useSharedPostDetail(token: string, postId: number) {
  return useQuery({
    queryKey: sharedQueryKeys.postDetail(token, postId),
    queryFn: () => fetchSharedPostDetail(token, postId),
    retry: false,
  });
}

/** placeId 는 ?placeId= 쿼리에서 오므로 없을 수 있다 — 그동안은 조회를 끈다. */
export function useSharedPlaceDetail(token: string, placeId: number | null) {
  return useQuery({
    queryKey: sharedQueryKeys.placeDetail(token, placeId ?? -1),
    queryFn: () => fetchSharedPlaceDetail(token, placeId as number),
    enabled: placeId !== null,
    retry: false,
  });
}

export function useSaveSharedPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveSharedPost,
    // 내 아카이브에 게시물이 늘었고, 공유 상세의 groups(저장 상태)도 달라졌다.
    onSuccess: (_postId, variables) => {
      queryClient.invalidateQueries({ queryKey: archiveQueryKeys.list });
      queryClient.invalidateQueries({
        queryKey: sharedQueryKeys.postDetail(variables.shareToken, variables.sharedPostId),
      });
    },
  });
}
