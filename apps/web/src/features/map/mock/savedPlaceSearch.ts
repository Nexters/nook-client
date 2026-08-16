import type { SavedPlaceSearchResult } from '../types';

/**
 * "저장한 공간 검색" 목데이터 — 저장 장소 검색 API 가 아직 없어(백엔드 작업 대기)
 * 실제 연동 전까지 검색 UI 를 이 데이터로 그린다. archiveId 는 실제 아카이브 id 와
 * 무관한 표시 전용 값이라, 칩 필터는 mock 끼리만 맞물려 동작한다.
 */
export const MOCK_SAVED_PLACES: SavedPlaceSearchResult[] = [
  { id: 1, name: '하우스 오브 와일드', category: '카페', region: '서울', archiveId: 1 },
  { id: 2, name: '퍼머넌트해비탯', category: '카페', region: '서울', archiveId: 1 },
  { id: 3, name: '성수 세터커피', category: '카페', region: '서울', archiveId: 1 },
  { id: 4, name: '성수동 비터앤츠', category: '베이커리', region: '서울', archiveId: 2 },
  { id: 5, name: '성수 파우세', category: '밥집', region: '서울', archiveId: 2 },
  { id: 6, name: '탐석과 사랑', category: '밥집', region: '서울', archiveId: 2 },
  { id: 7, name: '성수 스테이 호텔', category: '숙소', region: '서울', archiveId: 3 },
  { id: 8, name: '프렌즈앤야드', category: '카페', region: '서울', archiveId: 3 },
];

/** 이름 비교 전 정규화 — 공백 차이("하우스오브" vs "하우스 오브")로 못 찾는 일이 없게 한다. */
function normalize(value: string): string {
  return value.replace(/\s/g, '').toLowerCase();
}

/**
 * 저장한 공간 검색 mock. 실제 API 와 같은 resolve 계약(Promise)으로 두어,
 * 연동 시 `useSearchSavedPlaces` 의 queryFn 만 실제 fetch 로 바꾸면 된다.
 * 빈 검색어는 "아직 검색 전" 상태라 빈 결과를 준다.
 */
export function searchSavedPlacesMock(
  query: string,
  archiveId: number | null,
): Promise<SavedPlaceSearchResult[]> {
  const normalizedQuery = normalize(query);
  if (normalizedQuery.length === 0) return Promise.resolve([]);

  return Promise.resolve(
    MOCK_SAVED_PLACES.filter(
      (place) =>
        normalize(place.name).includes(normalizedQuery) &&
        (archiveId === null || place.archiveId === archiveId),
    ),
  );
}
