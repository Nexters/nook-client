import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useIsAuthenticated } from '@/features/auth/session/AuthSessionProvider';
import { isThumbnailParsing } from '@/features/place/thumbnailPolling';
import type { MapBounds, SavedPlaceSearchPage } from '../types';
import {
  disconnectPostPlace,
  fetchMapPins,
  fetchPlaceDetail,
  fetchPlacePosts,
  fetchRecentPlaces,
  fetchSavedPlaceSearch,
  fetchSharedPlaceDetail,
  updatePlaceBookmark,
  updatePlaceMemo,
} from '.';

const THUMBNAIL_POLL_INTERVAL_MS = 3000;

export const mapQueryKeys = {
  pinsAll: ['map', 'pins'] as const,
  pins: (bounds: MapBounds) => ['map', 'pins', bounds] as const,
  recent: ['map', 'recent'] as const,
  // 공유 토큰이 있으면 공유자 기준 읽기 전용 상세라 별도 캐시 키를 쓴다 — 내 상세(북마크·메모
  // 포함)와 모양이 다르니 같은 장소를 두 경로로 봤을 때 서로 캐시를 덮어쓰면 안 된다.
  detail: (placeId: number, shareToken?: string | null) =>
    shareToken
      ? (['shared', shareToken, 'places', placeId] as const)
      : (['map', 'detail', placeId] as const),
  // 내 장소 상세 키의 접두사 아래에 두는 게 의도적이다 — 북마크·메모·연결끊기가 무효화하는
  // `detail(placeId)` 가 접두사 매칭으로 이 목록까지 함께 갱신한다. 공유 진입에는 쓰지 않는다
  // (모아보기 페이지는 내 API 만 쓴다).
  posts: (placeId: number) => ['map', 'detail', placeId, 'posts'] as const,
  search: (query: string, groupId: number | null) => ['map', 'search', query, groupId] as const,
};

/** 지도 핀(bbox 안의 북마크 장소). 실제 idle 이벤트를 못 받은 동안엔 호출부가 근사 bbox를 대신 넘긴다. */
export function useMapPins(bounds: MapBounds) {
  const isAuthenticated = useIsAuthenticated();

  return useQuery({
    queryKey: mapQueryKeys.pins(bounds),
    queryFn: () => fetchMapPins(bounds),
    // 게스트에게는 찍을 핀이 없다 — 지도만 보이고 목록은 로그인 월이 막는다.
    enabled: isAuthenticated,
    // bbox 가 바뀔 때마다 쿼리 키가 통째로 바뀐다 — placeholder 없이는 새 응답이 올
    // 때까지 data 가 undefined 로 떨어져, 팬/줌 때마다 화면의 핀이 전부 사라졌다가
    // 다시 찍힌다. 직전 bbox 의 핀을 유지해 그 깜빡임을 없앤다.
    placeholderData: keepPreviousData,
    refetchInterval: (query) =>
      query.state.data?.some(isThumbnailParsing) ? THUMBNAIL_POLL_INTERVAL_MS : false,
  });
}

/** "최근 저장한 공간" — 장소 미선택 상태의 목록 모드. */
export function useRecentPlaces() {
  const isAuthenticated = useIsAuthenticated();

  return useQuery({
    queryKey: mapQueryKeys.recent,
    queryFn: fetchRecentPlaces,
    enabled: isAuthenticated,
    refetchInterval: (query) =>
      query.state.data?.some(isThumbnailParsing) ? THUMBNAIL_POLL_INTERVAL_MS : false,
  });
}

/**
 * 저장한 공간 검색 — 검색 모드의 결과 목록. 검색어가 비면 조회하지 않는다.
 * 타이핑 중 이전 결과를 유지(`keepPreviousData`)해 목록 깜빡임을 없앤다 — 디바운스는
 * 입력 쪽(`useDebouncedValue`) 책임이다(post 의 `usePlaceSearch` 와 동일 컨벤션).
 *
 * 첫 검색이 도착하기 전에는 undefined 를 준다 — 빈 페이지를 주면 결과가 오기도 전에
 * "0건 + 빈 상태 일러스트"가 깜빡인다. 호출부는 undefined 동안 결과 영역을 그리지 않는다.
 */
export function useSearchSavedPlaces(
  query: string,
  groupId: number | null,
): SavedPlaceSearchPage | undefined {
  const isAuthenticated = useIsAuthenticated();
  const trimmed = query.trim();
  const result = useQuery({
    queryKey: mapQueryKeys.search(trimmed, groupId),
    queryFn: () => fetchSavedPlaceSearch(trimmed, groupId),
    enabled: isAuthenticated && trimmed.length > 0,
    placeholderData: keepPreviousData,
  });
  // keepPreviousData 는 검색어를 지워 비활성화된 뒤에도 직전 데이터를 물고 있다 —
  // 빈 검색어에서는 명시적으로 비워야 지운 즉시 결과가 사라진다.
  return trimmed.length > 0 ? result.data : undefined;
}

/**
 * 장소 상세. 공유 아카이브 딥링크(`?shareToken=` 동반 진입)로 들어온 경우엔 항상
 * 공유 토큰 스코프의 공개 API 로 조회한다 — 이미 내가 저장한 장소라도 공유 링크로
 * 들어온 화면은 공유자 기준 읽기 전용으로 보여주는 게 맞다는 정책이다. `GET
 * /places/{placeId}`(내 API)는 애초에 저장 안 한 장소면 404 가 나므로도 필요하다.
 */
export function usePlaceDetail(placeId: number | null, shareToken?: string | null) {
  const isAuthenticated = useIsAuthenticated();

  return useQuery({
    queryKey: mapQueryKeys.detail(placeId ?? -1, shareToken),
    queryFn: () =>
      shareToken
        ? fetchSharedPlaceDetail(shareToken, placeId as number)
        : fetchPlaceDetail(placeId as number),
    enabled: isAuthenticated && placeId !== null,
  });
}

/**
 * 장소에 저장된 게시물 전체 — `/place/{placeId}/posts` 페이지의 무한 스크롤.
 *
 * 시트는 `usePlaceDetail` 이 준 첫 페이지만 쓰므로 쿼리를 나눴다(그쪽을 무한 쿼리로 바꾸면
 * 같은 캐시를 보는 지도 핀·이동까지 파급된다).
 */
export function usePlacePosts(placeId: number | null) {
  const isAuthenticated = useIsAuthenticated();

  return useInfiniteQuery({
    queryKey: mapQueryKeys.posts(placeId ?? -1),
    queryFn: ({ pageParam }) => fetchPlacePosts(placeId as number, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    select: (data) => ({
      posts: data.pages.flatMap((page) => page.posts),
      totalElements: data.pages[0]?.totalElements ?? 0,
    }),
    enabled: isAuthenticated && placeId !== null,
  });
}

/**
 * 북마크 토글. 성공하면 상세 쿼리를 무효화하고(낙관적 갱신 없음, archive/post 와 동일 컨벤션)
 * `/places/map`이 북마크된 장소만 내려주므로 지도 핀도 함께 무효화한다 — 그래야 이 화면을
 * 벗어나지 않고도 방금 북마크를 뗀 핀이 지도에서 사라지고(또는 새로 단 핀이 나타나고) 반영된다.
 */
export function useUpdatePlaceBookmark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ placeId, bookmarked }: { placeId: number; bookmarked: boolean }) =>
      updatePlaceBookmark(placeId, bookmarked),
    onSuccess: (_data, { placeId }) => {
      queryClient.invalidateQueries({ queryKey: mapQueryKeys.detail(placeId) });
      queryClient.invalidateQueries({ queryKey: mapQueryKeys.pinsAll });
      // 연관 장소의 별 표시는 게시물 상세 응답(`postQueryKeys.detail` = ['posts', postId])의
      // places 에서 온다 — post → map 방향 import 가 이미 있어 순환을 피해 접두사를 직접 쓴다.
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

/**
 * 장소 메모 저장. 게시물 메모(`useUpdatePostMemo`)와 저장 위치가 다른 별개의 메모다.
 * 성공하면 상세 쿼리만 무효화한다 — 핀·목록엔 메모가 안 나온다(낙관적 갱신 없음, 동일 컨벤션).
 */
export function useUpdatePlaceMemo(placeId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memo: string) => updatePlaceMemo(placeId, memo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mapQueryKeys.detail(placeId) });
    },
  });
}

/**
 * 장소 삭제 = 그 장소를 가리키던 저장 게시물들과의 연결 끊기.
 * 지도 장소 상세의 "게시물에 포함된 장소"는 여러 게시물에서 모아 보여주므로, 화면이
 * 넘겨준 게시물마다 한 번씩 끊는다. 하나라도 실패하면 실패로 본다(호출부가 목록을 되돌린다).
 */
export function useDisconnectPlaceFromPosts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ placeId, postIds }: { placeId: number; postIds: number[] }) =>
      Promise.all(postIds.map((postId) => disconnectPostPlace(postId, placeId))),
    onSuccess: (_data, { placeId, postIds }) => {
      queryClient.invalidateQueries({ queryKey: mapQueryKeys.pinsAll });
      queryClient.invalidateQueries({ queryKey: mapQueryKeys.recent });
      queryClient.invalidateQueries({ queryKey: mapQueryKeys.detail(placeId) });
      for (const postId of postIds) {
        // 게시물 상세는 post feature 소유지만 키 접두사가 같아 여기서 무효화한다
        // (map → post 방향 import 가 이미 있어 순환을 피해 접두사를 직접 쓴다).
        queryClient.invalidateQueries({ queryKey: ['posts', postId] });
      }
      queryClient.invalidateQueries({ queryKey: ['archives'] });
    },
  });
}
