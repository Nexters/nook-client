import { describe, expect, it } from 'vitest';
import { searchMockPlaces } from './placeSearchResults';

describe('searchMockPlaces', () => {
  it('검색어가 비어 있으면 빈 배열을 반환한다', () => {
    expect(searchMockPlaces('')).toEqual([]);
    expect(searchMockPlaces('   ')).toEqual([]);
  });

  it('이름에 검색어가 포함된 장소만 반환한다', () => {
    const results = searchMockPlaces('앤미');
    expect(results.map((place) => place.name)).toEqual(['앤미', '앤미용실', '앤미술']);
  });

  it('일치하는 장소가 없으면 빈 배열을 반환한다', () => {
    expect(searchMockPlaces('존재하지않는장소')).toEqual([]);
  });
});
