import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useIsAuthenticated } from '@/features/auth/session/AuthSessionProvider';
import { mapQueryKeys } from '@/features/map/api/queries';
import {
  createArchive,
  deleteArchive,
  deleteArchivePosts,
  fetchArchivePlaces,
  fetchArchivePosts,
  fetchArchives,
  issueShareLink,
  removeSharedArchive,
  updateArchive,
} from '.';

export const archiveQueryKeys = {
  list: ['archives'] as const,
  posts: (archiveId: number) => ['archives', archiveId, 'posts'] as const,
  places: (archiveId: number) => ['archives', archiveId, 'places'] as const,
};

/** 처리 중(본문 크롤링·장소 파싱)인 게시물이 있는 동안의 재조회 간격 — post 쪽 폴링과 같은 값. */
const POLL_INTERVAL_MS = 3000;

/** 아카이브 목록. 목록/상세/편집 화면이 같은 캐시를 공유한다. */
export function useArchives() {
  const isAuthenticated = useIsAuthenticated();

  return useQuery({
    queryKey: archiveQueryKeys.list,
    queryFn: fetchArchives,
    // 게스트 목록은 서버가 아니라 화면이 안내용 기본 아카이브 하나로 채운다(ArchivePage).
    enabled: isAuthenticated,
  });
}

/**
 * 아카이브에 저장된 게시물. 서버가 페이지로 내려주므로 스크롤에 맞춰 이어 붙인다.
 * 아카이브 소유자 닉네임도 이 응답에만 있어 함께 돌려준다.
 * 저장 직후엔 BE 가 본문/장소를 비동기로 처리해 카드가 로딩 상태로 내려올 수 있다 —
 * 처리 중인 게시물이 하나라도 있으면 끝날 때까지 폴링해 카드를 실시간으로 채운다.
 */
export function useArchivePosts(archiveId: number | undefined) {
  const isAuthenticated = useIsAuthenticated();

  return useInfiniteQuery({
    queryKey: archiveQueryKeys.posts(archiveId ?? -1),
    queryFn: ({ pageParam }) => fetchArchivePosts(archiveId as number, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    select: (data) => ({
      posts: data.pages.flatMap((page) => page.posts),
      ownerNickname: data.pages[0]?.ownerNickname,
      totalElements: data.pages[0]?.totalElements ?? 0,
    }),
    enabled: isAuthenticated && archiveId !== undefined,
    // 폴링은 화면에 있는 동안만 돈다 — 떠나 있는 사이 끝난 처리를 진입 즉시 반영하려면
    // 한 번은 다시 읽어야 한다. 폴링이 이미 매 3초 전 페이지를 다시 읽으므로 추가 비용은 그보다 작다.
    refetchOnMount: 'always',
    refetchInterval: (query) => {
      const anyProcessing = query.state.data?.pages.some((page) =>
        page.posts.some((post) => post.processingState === 'processing'),
      );
      return anyProcessing ? POLL_INTERVAL_MS : false;
    },
  });
}

/**
 * 아카이브에 저장된 장소 — 상세 "장소" 탭 목록. 게시물처럼 페이지를 이어 붙인다.
 * 저장 직후엔 BE 가 썸네일을 비동기로 파싱한다 — 처리 중(`thumbnailState === 'processing'`)인
 * 장소가 하나라도 있으면 끝날 때까지 폴링해 카드를 실시간으로 채운다.
 */
export function useArchivePlaces(archiveId: number | undefined) {
  const isAuthenticated = useIsAuthenticated();

  return useInfiniteQuery({
    queryKey: archiveQueryKeys.places(archiveId ?? -1),
    queryFn: ({ pageParam }) => fetchArchivePlaces(archiveId as number, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    select: (data) => ({
      places: data.pages.flatMap((page) => page.places),
      totalElements: data.pages[0]?.totalElements ?? 0,
    }),
    enabled: isAuthenticated && archiveId !== undefined,
    refetchOnMount: 'always',
    refetchInterval: (query) => {
      const anyProcessing = query.state.data?.pages.some((page) =>
        page.places.some((place) => place.thumbnailState === 'processing'),
      );
      return anyProcessing ? POLL_INTERVAL_MS : false;
    },
  });
}

export function useCreateArchive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createArchive,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: archiveQueryKeys.list }),
  });
}

export function useUpdateArchive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateArchive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: archiveQueryKeys.list });
      // 그룹 색상이 지도 핀 색으로 그대로 내려오므로 함께 무효화한다.
      queryClient.invalidateQueries({ queryKey: mapQueryKeys.pinsAll });
    },
  });
}

export function useDeleteArchive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteArchive,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: archiveQueryKeys.list }),
  });
}

export function useIssueShareLink() {
  // 발급은 조회 캐시에 영향이 없다 — 응답 token 을 바로 쓴다.
  return useMutation({ mutationFn: issueShareLink });
}

export function useRemoveSharedArchive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeSharedArchive,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: archiveQueryKeys.list }),
  });
}

/** 선택 삭제 — 단건 삭제 묶음(`deleteArchivePosts`). */
export function useDeleteArchivePosts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteArchivePosts,
    // 일부 실패 시에도 성공분은 이미 지워졌으므로 성공/실패와 무관하게 다시 불러온다.
    onSettled: () => {
      // ['archives'] 프리픽스라 아카이브 목록·게시물·장소 캐시가 전부 무효화된다.
      queryClient.invalidateQueries({ queryKey: archiveQueryKeys.list });
      // 게시물이 지워지면 딸린 장소 핀도 사라진다 — 북마크 토글과 같은 정책.
      queryClient.invalidateQueries({ queryKey: mapQueryKeys.pinsAll });
    },
  });
}
