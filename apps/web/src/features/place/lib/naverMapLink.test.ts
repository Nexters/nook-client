import { describe, expect, it } from 'vitest';
import { buildNaverMapSearchUrl } from './naverMapLink';

describe('buildNaverMapSearchUrl', () => {
  it('주소와 상호를 합쳐 네이버 지도 검색 URL 을 만든다', () => {
    expect(
      buildNaverMapSearchUrl({ name: '앤미', address: '서울 관악구 관악로 12길 47 (봉천동)' }),
    ).toBe(
      `https://map.naver.com/p/search/${encodeURIComponent('서울 관악구 관악로 12길 47 (봉천동) 앤미')}`,
    );
  });

  it('주소가 없으면 상호만 쓴다', () => {
    expect(buildNaverMapSearchUrl({ name: '앤미' })).toBe(
      `https://map.naver.com/p/search/${encodeURIComponent('앤미')}`,
    );
  });
});
