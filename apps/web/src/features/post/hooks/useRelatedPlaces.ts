import { useQuery } from '@tanstack/react-query';
import type { Place } from '@/features/place';
import type { ParsedPlace } from '../api';
import { getMockPlaceParsing } from '../mock/placeParsing';

export type RelatedPlacesState =
  | { status: 'loading' }
  | { status: 'success'; places: Place[]; bookmarkedPlaceIds: string[] }
  | { status: 'error' };

/** 파싱이 PENDING 인 동안의 재조회 간격. */
const PARSING_POLL_INTERVAL_MS = 3000;

/** 파싱 응답의 장소를 화면 도메인 `Place` 로 좁힌다 — distance/thumbnail 은 응답에 없어 생략한다(PlaceRow 가 옵셔널 처리). */
function toPlace(parsed: ParsedPlace): Place {
  return {
    id: String(parsed.id),
    name: parsed.name,
    category: parsed.category,
    address: parsed.address,
  };
}

/**
 * 연관 장소 파싱 결과 조회. 파싱은 저장 후 비동기로 도는 작업이라 PENDING 동안
 * 3초 간격으로 폴링한다. TanStack Query 상태 + 파싱 상태를 화면용 3-state union 으로
 * 좁혀 노출한다 — 소비처(RelatedPlacesSection)가 쿼리 객체 전체에 의존하지 않게 하기 위해서다.
 */
export function useRelatedPlaces(postId: string | undefined): RelatedPlacesState {
  const query = useQuery({
    queryKey: ['post', postId, 'place-parsing'],
    // TODO(api): BE 연결 시 `fetchPlaceParsing(postId)`(../api.ts) 로 교체한다.
    // `enabled` 가 이미 postId 가 정의된 경우에만 실행되도록 막고 있어 실제 호출로 바꿔도 항상 string 이 넘어간다.
    queryFn: () => getMockPlaceParsing(postId),
    enabled: postId !== undefined,
    refetchInterval: (current) =>
      current.state.data?.placeParsingStatus === 'PENDING' ? PARSING_POLL_INTERVAL_MS : false,
  });

  if (query.isPending) return { status: 'loading' };
  if (query.isError) return { status: 'error' };

  const result = query.data;
  if (result.placeParsingStatus === 'PENDING') return { status: 'loading' };
  if (result.placeParsingStatus === 'FAILED') return { status: 'error' };
  return {
    status: 'success',
    places: result.places.map(toPlace),
    bookmarkedPlaceIds: result.places
      .filter((place) => place.bookmarked)
      .map((place) => String(place.id)),
  };
}
