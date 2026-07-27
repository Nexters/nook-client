import { describe, expect, it } from 'vitest';
import { getDistanceKm, getMockPlaces } from '@/features/map/mock/places';

describe('getMockPlaces', () => {
  it('현재 위치를 기준으로 반경 내 좌표를 반환한다', () => {
    const center = { lat: 37.5, lng: 127 };
    const places = getMockPlaces(center);

    expect(places.length).toBeGreaterThan(0);
    for (const place of places) {
      expect(Math.abs(place.lat - center.lat)).toBeLessThan(0.01);
      expect(Math.abs(place.lng - center.lng)).toBeLessThan(0.01);
    }
  });

  it('중심 좌표가 달라지면 핀 좌표도 같은 오프셋만큼 이동한다', () => {
    const a = getMockPlaces({ lat: 0, lng: 0 });
    const b = getMockPlaces({ lat: 1, lng: 2 });
    const bById = new Map(b.map((place) => [place.id, place]));

    for (const place of a) {
      const moved = bById.get(place.id);
      expect(moved).toBeDefined();
      expect(moved?.lat ?? Number.NaN).toBeCloseTo(place.lat + 1);
      expect(moved?.lng ?? Number.NaN).toBeCloseTo(place.lng + 2);
    }
  });

  it('id 로 서로 다른 장소를 구분할 수 있다', () => {
    const places = getMockPlaces({ lat: 37.5, lng: 127 });
    const ids = new Set(places.map((place) => place.id));
    expect(ids.size).toBe(places.length);
  });
});

describe('getDistanceKm', () => {
  it('같은 좌표면 거리가 0이다', () => {
    const point = { lat: 37.5729, lng: 126.9762 };
    expect(getDistanceKm(point, point)).toBe(0);
  });

  it('순서를 바꿔도 같은 거리를 반환한다(대칭)', () => {
    const a = { lat: 37.5729, lng: 126.9762 };
    const b = { lat: 37.5751, lng: 126.9768 };
    expect(getDistanceKm(a, b)).toBeCloseTo(getDistanceKm(b, a));
  });

  it('위도 1도 차이는 대략 111km 다', () => {
    const a = { lat: 0, lng: 0 };
    const b = { lat: 1, lng: 0 };
    expect(getDistanceKm(a, b)).toBeCloseTo(111.2, 0);
  });
});
