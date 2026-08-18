import { describe, expect, it } from 'vitest';
import type { SavedPlaceSearchPageResponse } from '@/shared/api';
import { toSavedPlaceSearchPage } from '.';

const PAGE: SavedPlaceSearchPageResponse = {
  hasNext: false,
  items: [
    { id: 11, name: '하우스 오브 와일드', address: '서울 성동구 성수이로 118', category: '카페' },
  ],
  page: 0,
  size: 100,
  totalElements: 1,
  totalPages: 1,
};

describe('toSavedPlaceSearchPage', () => {
  it('검색 결과 아이템을 카드 형태로, 전체 건수를 totalCount 로 옮긴다', () => {
    const page = toSavedPlaceSearchPage(PAGE);

    expect(page.totalCount).toBe(1);
    expect(page.items).toEqual([
      { id: 11, name: '하우스 오브 와일드', category: '카페', region: '서울' },
    ]);
  });

  it('카테고리가 null 이면 undefined 로 비운다', () => {
    const page = toSavedPlaceSearchPage({
      ...PAGE,
      items: [{ id: 12, name: '탐석과 사랑', address: '경기 성남시 분당구', category: null }],
    });

    expect(page.items[0]?.category).toBeUndefined();
    expect(page.items[0]?.region).toBe('경기');
  });

  it('주소가 비어 있으면 region 을 비운다', () => {
    const page = toSavedPlaceSearchPage({
      ...PAGE,
      items: [{ id: 13, name: '이름만 있는 곳', address: '', category: '카페' }],
    });

    expect(page.items[0]?.region).toBeUndefined();
  });
});
