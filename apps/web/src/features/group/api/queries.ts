import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createGroup, deleteGroup, fetchGroupPosts, fetchGroups, updateGroup } from '.';

export const groupQueryKeys = {
  list: ['groups'] as const,
  posts: (groupId: number) => ['groups', groupId, 'posts'] as const,
};

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
