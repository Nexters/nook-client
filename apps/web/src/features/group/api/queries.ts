import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { mapQueryKeys } from '@/features/map/api/queries';
import {
  createGroup,
  deleteGroup,
  deleteGroupPosts,
  fetchGroupPlaces,
  fetchGroupPosts,
  fetchGroups,
  updateGroup,
} from '.';

export const groupQueryKeys = {
  list: ['groups'] as const,
  posts: (groupId: number) => ['groups', groupId, 'posts'] as const,
  places: (groupId: number) => ['groups', groupId, 'places'] as const,
};

/** 처리 중(본문 크롤링·장소 파싱)인 게시물이 있는 동안의 재조회 간격 — post 쪽 폴링과 같은 값. */
const POLL_INTERVAL_MS = 3000;

/** 그룹 목록. 목록/상세/편집 화면이 같은 캐시를 공유한다. */
export function useGroups() {
  return useQuery({
    queryKey: groupQueryKeys.list,
    queryFn: fetchGroups,
  });
}

/**
 * 그룹에 저장된 게시물. 서버가 페이지로 내려주므로 스크롤에 맞춰 이어 붙인다.
 * 그룹 소유자 닉네임도 이 응답에만 있어 함께 돌려준다.
 * 저장 직후엔 BE 가 본문/장소를 비동기로 처리해 카드가 로딩 상태로 내려올 수 있다 —
 * 처리 중인 게시물이 하나라도 있으면 끝날 때까지 폴링해 카드를 실시간으로 채운다.
 */
export function useGroupPosts(groupId: number | undefined) {
  return useInfiniteQuery({
    queryKey: groupQueryKeys.posts(groupId ?? -1),
    queryFn: ({ pageParam }) => fetchGroupPosts(groupId as number, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    select: (data) => ({
      posts: data.pages.flatMap((page) => page.posts),
      ownerNickname: data.pages[0]?.ownerNickname,
      totalElements: data.pages[0]?.totalElements ?? 0,
    }),
    enabled: groupId !== undefined,
    refetchInterval: (query) => {
      const anyProcessing = query.state.data?.pages.some((page) =>
        page.posts.some((post) => post.processingState === 'processing'),
      );
      return anyProcessing ? POLL_INTERVAL_MS : false;
    },
  });
}

/** 그룹에 저장된 장소 — 상세 "장소" 탭 목록. 게시물처럼 페이지를 이어 붙인다. */
export function useGroupPlaces(groupId: number | undefined) {
  return useInfiniteQuery({
    queryKey: groupQueryKeys.places(groupId ?? -1),
    queryFn: ({ pageParam }) => fetchGroupPlaces(groupId as number, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    select: (data) => ({
      places: data.pages.flatMap((page) => page.places),
      totalElements: data.pages[0]?.totalElements ?? 0,
    }),
    enabled: groupId !== undefined,
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createGroup,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupQueryKeys.list }),
  });
}

export function useUpdateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateGroup,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupQueryKeys.list }),
  });
}

export function useDeleteGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteGroup,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupQueryKeys.list }),
  });
}

/** 선택 삭제 — 단건 삭제 묶음(`deleteGroupPosts`). */
export function useDeleteGroupPosts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteGroupPosts,
    // 일부 실패 시에도 성공분은 이미 지워졌으므로 성공/실패와 무관하게 다시 불러온다.
    onSettled: () => {
      // ['groups'] 프리픽스라 그룹 목록·게시물·장소 캐시가 전부 무효화된다.
      queryClient.invalidateQueries({ queryKey: groupQueryKeys.list });
      // 게시물이 지워지면 딸린 장소 핀도 사라진다 — 북마크 토글과 같은 정책.
      queryClient.invalidateQueries({ queryKey: mapQueryKeys.pinsAll });
    },
  });
}
