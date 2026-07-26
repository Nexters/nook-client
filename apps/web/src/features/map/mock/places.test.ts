import { describe, expect, it } from 'vitest';
import { getMockPlaces } from '@/features/map/mock/places';

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
