import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { mapQueryKeys } from '@/features/map/api/queries';
import type { Place } from '@/features/place';
import type { ParsedPlace, PostDetail } from '../types';
import { fetchPlaceParsing, fetchPostDetail, updatePlaceBookmark, updatePostMemo } from '.';

export const postQueryKeys = {
  detail: (postId: number) => ['posts', postId] as const,
  placeParsing: (postId: number) => ['posts', postId, 'place-parsing'] as const,
};

/** 처리 중(본문 크롤링·장소 파싱)인 동안의 재조회 간격. 두 폴링 모두 같은 값을 쓴다. */
const POLL_INTERVAL_MS = 3000;

export type PostDetailState =
  | { status: 'loading' }
  | { status: 'success'; detail: PostDetail }
  | { status: 'error' };

/**
 * 게시물 상세. 저장 직후엔 BE 가 본문을 비동기로 처리해서 title/media 가 비어 있을 수
 * 있다 — `processingStatus` 가 PENDING/PROCESSING 인 동안은 폴링하며 로딩으로 보여준다.
 * TanStack Query 상태 + 처리 상태를 화면용 3-state union 으로 좁혀 노출한다 — 소비처
 * (PostDetailPage)가 쿼리 객체 전체에 의존하지 않게 하기 위해서다.
 */
export function usePostDetail(postId: number | undefined): PostDetailState {
  const query = useQuery({
    queryKey: postQueryKeys.detail(postId ?? -1),
    queryFn: () => fetchPostDetail(postId as number),
    enabled: postId !== undefined,
    refetchInterval: (current) => {
      const status = current.state.data?.processingStatus;
      return status === 'PENDING' || status === 'PROCESSING' ? POLL_INTERVAL_MS : false;
    },
  });

  if (query.isPending) return { status: 'loading' };
  if (query.isError) return { status: 'error' };

  const detail = query.data;
  if (detail.processingStatus === 'PENDING' || detail.processingStatus === 'PROCESSING') {
    return { status: 'loading' };
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
function toPlace(parsed: ParsedPlace): Place {
  return {
    id: String(parsed.id),
    name: parsed.name,
    category: parsed.category ?? '',
    address: parsed.address,
    // 썸네일 파싱이 끝나기 전(진행 중·실패)에는 빈 썸네일(플레이스홀더)로 보여준다.
    thumbnail: parsed.thumbnailParsingStatus === 'COMPLETED' ? parsed.thumbnail : undefined,
  };
}

/**
 * 연관 장소 파싱 결과 조회. 파싱은 저장 후 비동기로 도는 작업이라 PENDING/PROCESSING 동안
 * 폴링한다. TanStack Query 상태 + 파싱 상태를 화면용 3-state union 으로 좁혀 노출한다 —
 * 소비처(RelatedPlacesSection)가 쿼리 객체 전체에 의존하지 않게 하기 위해서다.
 */
export function useRelatedPlaces(postId: number | undefined): RelatedPlacesState {
  const query = useQuery({
    queryKey: postQueryKeys.placeParsing(postId ?? -1),
    queryFn: () => fetchPlaceParsing(postId as number),
    enabled: postId !== undefined,
    refetchInterval: (current) => {
      const result = current.state.data;
      if (!result) return false;
      const parsingPlaces =
        result.placeParsingStatus === 'PENDING' || result.placeParsingStatus === 'PROCESSING';
      // 장소 파싱이 끝나도 장소별 썸네일은 비동기로 계속 파싱된다 — 미완인 장소가
      // 남아 있으면 폴링을 이어가 완성되는 대로 이미지를 반영한다(FAILED 는 종료 상태).
      const parsingThumbnails =
        result.placeParsingStatus === 'COMPLETED' &&
        result.places.some(
          (place) =>
            place.thumbnailParsingStatus === 'PENDING' ||
            place.thumbnailParsingStatus === 'PROCESSING',
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

/** 메모 저장. 성공하면 상세 쿼리를 무효화해 새 메모를 반영한다(낙관적 갱신 없음, group 과 동일 컨벤션). */
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
      }
      queryClient.invalidateQueries({ queryKey: mapQueryKeys.pinsAll });
      queryClient.invalidateQueries({ queryKey: mapQueryKeys.detail(placeId) });
    },
  });
}
