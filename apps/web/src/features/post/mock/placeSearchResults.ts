import type { Place } from '@/features/place';

/**
 * `PlaceDirectInputDrawer` 검색 결과 목데이터. 실제 장소 검색 API 연동 전까지
 * 이름에 검색어가 포함되는 항목만 클라이언트에서 필터링해 보여준다.
 */
const MOCK_SEARCH_PLACES: Place[] = [
  {
    id: 'search-1',
    name: '앤미',
    category: '일식',
    distance: '16.2km',
    address: '서울 관악구 관악로 12길 47 (봉천동)',
  },
  {
    id: 'search-2',
    name: '앤미용실',
    category: '미용실',
    distance: '16.2km',
    address: '서울 관악구 관악로 12길 47 (봉천동)',
  },
  {
    id: 'search-3',
    name: '앤미술',
    category: '교습소',
    distance: '16.2km',
    address: '서울 관악구 관악로 12길 47 (봉천동)',
  },
];

export function searchMockPlaces(query: string): Place[] {
  const normalized = query.trim().toLowerCase();
  if (normalized.length === 0) return [];
  return MOCK_SEARCH_PLACES.filter((place) => place.name.toLowerCase().includes(normalized));
}
