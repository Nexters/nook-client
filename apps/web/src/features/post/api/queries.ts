import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { archiveQueryKeys } from '@/features/archive/api/queries';
import { useIsAuthenticated } from '@/features/auth/session/AuthSessionProvider';
import { mapQueryKeys } from '@/features/map/api/queries';
import type { Place } from '@/features/place';
import type { Coordinates } from '@/shared/lib/geolocation';
import type { ParsedPlace, PostDetail, SearchedPlace } from '../types';
import {
  connectPostPlace,
  disconnectPostPlace,
  fetchPlaceParsing,
  fetchPostDetail,
  searchConnectablePlaces,
  updatePlaceBookmark,
  updatePostMemo,
} from '.';

export const postQueryKeys = {
  detail: (postId: number) => ['posts', postId] as const,
  placeParsing: (postId: number) => ['posts', postId, 'place-parsing'] as const,
};

/** 처리 중(본문 크롤링·장소 파싱)인 동안의 재조회 간격. 두 폴링 모두 같은 값을 쓴다. */
const POLL_INTERVAL_MS = 3000;

export type PostDetailState =
  | { status: 'loading' }
  | { status: 'processing'; percent: number }
  | { status: 'success'; detail: PostDetail }
  | { status: 'error' };

/**
 * 게시물 상세. 저장 직후엔 BE 가 본문을 비동기로 처리해서 title/media 가 비어 있을 수
 * 있다 — `processingStatus` 가 PENDING/PROCESSING 동안은 폴링하며
 * processing 상태(진행률 포함)로 노출한다.
 * TanStack Query 상태 + 처리 상태를 화면용 4-state union 으로 좁혀 노출한다 — 소비처
 * (PostDetailPage)가 쿼리 객체 전체에 의존하지 않게 하기 위해서다.
 */
export function usePostDetail(postId: number | undefined): PostDetailState {
  const isAuthenticated = useIsAuthenticated();
  const query = useQuery({
    queryKey: postQueryKeys.detail(postId ?? -1),
    queryFn: () => fetchPostDetail(postId as number),
    enabled: isAuthenticated && postId !== undefined,
    refetchInterval: (current) => {
      const status = current.state.data?.processingStatus;
      return status === 'PENDING' || status === 'PROCESSING' ? POLL_INTERVAL_MS : false;
    },
  });

  if (query.isPending) return { status: 'loading' };
  if (query.isError) return { status: 'error' };

  const detail = query.data;
  if (detail.processingStatus === 'PENDING' || detail.processingStatus === 'PROCESSING') {
    return { status: 'processing', percent: detail.processingPercent };
  }
  // 처리 실패 전용 화면은 아직 시안이 없다 — 연관 장소 파싱 실패와 같은 처리로 임시 통일한다.
  if (detail.processingStatus === 'FAILED') return { status: 'error' };
  return { status: 'success', detail };
}

export type RelatedPlacesState =
  | { status: 'loading' }
  | { status: 'success'; places: Place[]; bookmarkedPlaceIds: string[] }
  | { status: 'error' };

/** 파싱 응답의 장소를 화면 도메인 `Place` 로 좁힌다 — distance 는 응답에 없어 생략한다(PlaceRow 가 옵셔널 처리). */
export function toPlace(parsed: ParsedPlace): Place {
  return {
    id: String(parsed.id),
    name: parsed.name,
    category: parsed.category ?? '',
    address: parsed.address,
    // 썸네일은 파싱 상태와 무관하게 URL 이 있으면 쓴다 — 직접 연결한 장소는 서버가
    // thumbnailUrl 을 채운 채 상태를 PENDING 으로 남겨두는 경우가 있어서다(서버에
    // 상태 정리를 요청해둔 상태의 방어이자, 정리 후에도 무해한 규칙). URL 이 없을
    // 때만 빈 썸네일(플레이스홀더)로 보여준다.
    thumbnail: parsed.thumbnail || undefined,
  };
}

/**
 * 연관 장소 파싱 결과 조회. 파싱은 저장 후 비동기로 도는 작업이라 PENDING/PROCESSING 동안
 * 폴링한다. TanStack Query 상태 + 파싱 상태를 화면용 3-state union 으로 좁혀 노출한다 —
 * 소비처(RelatedPlacesSection)가 쿼리 객체 전체에 의존하지 않게 하기 위해서다.
 */
export function useRelatedPlaces(postId: number | undefined): RelatedPlacesState {
  const isAuthenticated = useIsAuthenticated();
  const query = useQuery({
    queryKey: postQueryKeys.placeParsing(postId ?? -1),
    queryFn: () => fetchPlaceParsing(postId as number),
    enabled: isAuthenticated && postId !== undefined,
    refetchInterval: (current) => {
      const result = current.state.data;
      if (!result) return false;
      const parsingPlaces =
        result.placeParsingStatus === 'PENDING' || result.placeParsingStatus === 'PROCESSING';
      // 장소 파싱이 끝나도 장소별 썸네일은 비동기로 계속 파싱된다 — 미완인 장소가
      // 남아 있으면 폴링을 이어가 완성되는 대로 이미지를 반영한다(FAILED 는 종료 상태).
      // 단 썸네일 URL 이 이미 있으면 더 기다릴 결과물이 없으므로 완료로 취급한다 —
      // 직접 연결한 장소가 PENDING 에 고정된 채 내려와 폴링이 영영 안 멈추는 것을 막는다
      // (`toPlace` 의 표시 규칙과 같은 기준).
      const parsingThumbnails =
        result.placeParsingStatus === 'COMPLETED' &&
        result.places.some(
          (place) =>
            !place.thumbnail &&
            (place.thumbnailParsingStatus === 'PENDING' ||
              place.thumbnailParsingStatus === 'PROCESSING'),
        );
      return parsingPlaces || parsingThumbnails ? POLL_INTERVAL_MS : false;
    },
  });

  if (query.isPending) return { status: 'loading' };
  if (query.isError) return { status: 'error' };

  const result = query.data;
  if (result.placeParsingStatus === 'PENDING' || result.placeParsingStatus === 'PROCESSING') {
    return { status: 'loading' };
  }
  if (result.placeParsingStatus === 'FAILED') return { status: 'error' };
  return {
    status: 'success',
    places: result.places.map(toPlace),
    bookmarkedPlaceIds: result.places
      .filter((place) => place.bookmarked)
      .map((place) => String(place.id)),
  };
}

/**
 * 직접 연결용 장소 검색. 검색어가 비면 조회하지 않고 빈 목록을 준다.
 * 타이핑 중 이전 결과를 유지(`keepPreviousData`)해 목록이 깜빡이지 않게 한다 —
 * 디바운스는 입력 쪽(`useDebouncedValue`) 책임이다.
 */
export function usePlaceSearch(query: string, coords: Coordinates | null): SearchedPlace[] {
  const isAuthenticated = useIsAuthenticated();
  const trimmed = query.trim();
  const result = useQuery({
    queryKey: ['places', 'search', trimmed, coords?.lat ?? null, coords?.lng ?? null],
    queryFn: () => searchConnectablePlaces(trimmed, coords),
    enabled: isAuthenticated && trimmed.length > 0,
    placeholderData: keepPreviousData,
  });
  // keepPreviousData 는 검색어를 지워 비활성화된 뒤에도 직전 데이터를 물고 있다 — 빈
  // 검색어에서는 명시적으로 빈 목록을 돌려줘야 지운 즉시 목록이 사라진다.
  return trimmed.length > 0 ? (result.data ?? []) : [];
}

/** 메모 저장. 성공하면 상세 쿼리를 무효화해 새 메모를 반영한다(낙관적 갱신 없음, archive 과 동일 컨벤션). */
export function useUpdatePostMemo(postId: number | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memo: string) => updatePostMemo(postId as number, memo),
    onSuccess: () => {
      if (postId === undefined) return;
      queryClient.invalidateQueries({ queryKey: postQueryKeys.detail(postId) });
    },
  });
}

/**
 * 연관 장소 북마크 토글. 성공하면 파싱 쿼리를 무효화해 별 표시가 서버 상태를 다시
 * 따르게 하고(낙관적 갱신 없음), 지도 화면도 이 장소의 북마크 상태로 그려지므로
 * (핀 목록은 북마크된 장소만 조회) 지도 쿼리들도 함께 무효화한다.
 */
export function useUpdatePlaceBookmark(postId: number | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ placeId, bookmarked }: { placeId: number; bookmarked: boolean }) =>
      updatePlaceBookmark(placeId, bookmarked),
    onSuccess: (_data, { placeId }) => {
      if (postId !== undefined) {
        queryClient.invalidateQueries({ queryKey: postQueryKeys.placeParsing(postId) });
        // 직접 연결한 장소의 북마크 상태는 게시물 상세(places)로 내려온다 — 상세도 갱신한다.
        queryClient.invalidateQueries({ queryKey: postQueryKeys.detail(postId) });
      }
      queryClient.invalidateQueries({ queryKey: mapQueryKeys.pinsAll });
      queryClient.invalidateQueries({ queryKey: mapQueryKeys.detail(placeId) });
    },
  });
}

/**
 * 장소 직접 연결(`POST /posts/{postId}/places`). 검색 결과의 selectionToken 을 보내면
 * 서버가 실 placeId 를 발급한다. 성공하면 장소 목록(파싱·상세)과 지도 쿼리를 무효화해
 * 연결된 장소가 서버 상태로 다시 그려지게 한다.
 */
export function useConnectPlace(postId: number | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (selectionToken: string) => {
      const placeId = await connectPostPlace(postId as number, selectionToken);
      // 시안: 직접 추가한 장소는 항상 저장(파란 북마크) 상태로 시작한다. 서버가 연결 시
      // 자동 북마크하는지 아직 확인 못 해(dev 서버 다운) 명시적으로 이어 건다 — 이미
      // 북마크된 장소에 다시 걸어도 무해하다. 북마크 실패가 연결 성공을 뒤집진 않는다
      // (재조회가 실제 서버 상태로 수렴시킨다).
      await updatePlaceBookmark(placeId, true).catch(() => {});
      return placeId;
    },
    onSuccess: (placeId) => {
      if (postId !== undefined) {
        queryClient.invalidateQueries({ queryKey: postQueryKeys.detail(postId) });
        queryClient.invalidateQueries({ queryKey: postQueryKeys.placeParsing(postId) });
      }
      queryClient.invalidateQueries({ queryKey: mapQueryKeys.pinsAll });
      queryClient.invalidateQueries({ queryKey: mapQueryKeys.detail(placeId) });
    },
  });
}

/**
 * 장소 삭제 = 이 게시물과 장소의 연결 끊기.
 * 끊긴 장소는 게시물 상세·파싱 목록에서 빠지고, 다른 게시물에 남아 있지 않으면 지도 핀과
 * 최근 저장 공간·아카이브 목록에서도 사라진다 — 어디까지 사라지는지는 서버가 정하므로
 * 관련 캐시를 모두 무효화해 다시 읽는다.
 */
export function useDisconnectPostPlace(postId: number | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (placeId: number) => disconnectPostPlace(postId as number, placeId),
    onSuccess: (_data, placeId) => {
      if (postId !== undefined) {
        queryClient.invalidateQueries({ queryKey: postQueryKeys.detail(postId) });
        queryClient.invalidateQueries({ queryKey: postQueryKeys.placeParsing(postId) });
      }
      queryClient.invalidateQueries({ queryKey: mapQueryKeys.pinsAll });
      queryClient.invalidateQueries({ queryKey: mapQueryKeys.recent });
      queryClient.invalidateQueries({ queryKey: mapQueryKeys.detail(placeId) });
      // ['archives'] 프리픽스라 아카이브 목록·게시물·장소 캐시가 함께 무효화된다.
      queryClient.invalidateQueries({ queryKey: archiveQueryKeys.list });
    },
  });
}
