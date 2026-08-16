import { describe, expect, it } from 'vitest';
import type { PlaceSearchResponse } from '@/shared/api';
import { toSearchedPlace } from '.';

const DTO: PlaceSearchResponse = {
  name: '앤미',
  address: '서울 관악구 관악로 12길 47 (봉천동)',
  latitude: 37.478,
  longitude: 126.951,
  category: '일식',
  distanceMeters: 16223,
  selectionToken: 'token-앤미',
};

describe('toSearchedPlace', () => {
  it('선택 토큰을 화면 식별자(id)로 쓰고 좌표·토큰을 함께 보존한다', () => {
    const place = toSearchedPlace(DTO);

    expect(place.id).toBe('token-앤미');
    expect(place.selectionToken).toBe('token-앤미');
    expect(place.name).toBe('앤미');
    expect(place.address).toBe('서울 관악구 관악로 12길 47 (봉천동)');
    expect(place.latitude).toBe(37.478);
    expect(place.longitude).toBe(126.951);
  });

  it('거리는 미터를 시안 표기(km/m)로 바꾼다', () => {
    expect(toSearchedPlace(DTO).distance).toBe('16.2km');
    expect(toSearchedPlace({ ...DTO, distanceMeters: 400 }).distance).toBe('400m');
  });

  it('거리·카테고리가 없으면 지어내지 않는다', () => {
    const place = toSearchedPlace({ ...DTO, distanceMeters: null, category: null });

    expect(place.distance).toBeUndefined();
    expect(place.category).toBe('');
  });
});
