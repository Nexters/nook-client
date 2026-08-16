import { describe, expect, it } from 'vitest';
import { MOCK_SAVED_PLACES, searchSavedPlacesMock } from './savedPlaceSearch';

describe('searchSavedPlacesMock', () => {
  it('빈 검색어(공백 포함)는 빈 결과를 준다', async () => {
    await expect(searchSavedPlacesMock('', null)).resolves.toEqual([]);
    await expect(searchSavedPlacesMock('   ', null)).resolves.toEqual([]);
  });

  it('이름에 검색어가 포함된 장소만 준다 — 공백 차이는 무시한다', async () => {
    // 데이터에는 "하우스 오브 와일드"로 들어 있다 — 붙여 써도 찾아야 한다.
    const results = await searchSavedPlacesMock('하우스오브', null);

    expect(results.length).toBeGreaterThan(0);
    for (const place of results) {
      expect(place.name.replace(/\s/g, '')).toContain('하우스오브');
    }
  });

  it('archiveId 를 주면 그 아카이브에 담긴 장소만 준다', async () => {
    const first = MOCK_SAVED_PLACES[0];
    if (!first) throw new Error('mock 데이터가 비어 있으면 테스트가 의미 없다');
    const archiveId = first.archiveId;
    const results = await searchSavedPlacesMock('성수', archiveId);

    expect(results.every((place) => place.archiveId === archiveId)).toBe(true);
  });

  it('일치하는 장소가 없으면 빈 배열을 준다', async () => {
    await expect(searchSavedPlacesMock('존재하지않는장소이름', null)).resolves.toEqual([]);
  });
});
