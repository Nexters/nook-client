import type { Place } from '@/features/place';

/**
 * `PlaceDirectInputDrawer` 검색 결과 목데이터. 실제 장소 검색 API 연동 전까지
 * 이름에 검색어가 포함되는 항목만 클라이언트에서 필터링해 보여준다.
 *
 * landmark/keywords 는 장소 상세(`PlaceSearchResultDetail`)에서 쓴다 — 검색 리스트
 * 자체는 이 필드들을 표시하지 않는다.
 */
const MOCK_SEARCH_PLACES: Place[] = [
  {
    id: 'search-1',
    name: '앤미',
    category: '일식',
    distance: '16.2km',
    address: '서울 관악구 관악로 12길 47 (봉천동)',
    landmark: '서울대입구역 2번 출구',
    keywords: ['조용한', '정갈한', '혼밥', '친절한'],
  },
  {
    id: 'search-2',
    name: '앤미용실',
    category: '미용실',
    distance: '16.2km',
    address: '서울 관악구 관악로 12길 47 (봉천동)',
    landmark: '서울대입구역 2번 출구',
    keywords: ['친절한'],
  },
  {
    id: 'search-3',
    name: '앤미술',
    category: '교습소',
    distance: '16.2km',
    address: '서울 관악구 관악로 12길 47 (봉천동)',
    landmark: '서울대입구역 3번 출구',
    keywords: ['조용한'],
  },
];

export function searchMockPlaces(query: string): Place[] {
  const normalized = query.trim().toLowerCase();
  if (normalized.length === 0) return [];
  return MOCK_SEARCH_PLACES.filter((place) => place.name.toLowerCase().includes(normalized));
}
