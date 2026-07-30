import type { Coordinates } from '@/shared/lib/geolocation';

export type MockPlace = {
  id: string;
  name: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
};

type MockPlaceOffset = Omit<MockPlace, 'lat' | 'lng'> & {
  /** 현재 위치 기준 위도/경도 오프셋(도). 대략 반경 100~350m 안에 흩어놓는다. */
  latOffset: number;
  lngOffset: number;
};

/**
 * "연관 장소" 섹션 전용 목데이터 — `GET /places/{placeId}`가 아직 연관 장소를 내려주지
 * 않아(연관 게시물만 내려준다) 실제 연동 전까지 이 자리만 임시로 채운다(백엔드에 필드
 * 추가를 요청해둔 상태). 그래서 여기서 나온 항목은 클릭해도 아무 동작이 없다 — 실제
 * 장소 id 체계와 무관한 표시 전용 데이터다.
 */
const MOCK_PLACE_OFFSETS: MockPlaceOffset[] = [
  {
    id: '1',
    name: '하우스 오브 와일드',
    category: '카페',
    address: '서울 성동구 서울숲 4길 12',
    latOffset: 0.0006,
    lngOffset: -0.0009,
  },
  {
    id: '2',
    name: '퍼머넌트해비탯',
    category: '카페',
    address: '서울 성동구 서울숲 7길 9 4층',
    latOffset: 0.0022,
    lngOffset: 0.0006,
  },
  {
    id: '3',
    name: '세터커피',
    category: '카페',
    address: '서울 성동구 성수이로20길 33',
    latOffset: -0.0023,
    lngOffset: 0.0017,
  },
  {
    id: '4',
    name: '비터앤츠',
    category: '베이커리',
    address: '서울 성동구 뚝섬로1길 5',
    latOffset: 0.0032,
    lngOffset: -0.0007,
  },
];

/**
 * 목데이터 오프셋을 실제 중심 좌표(선택된 장소 좌표) 기준으로 환산한다.
 */
export function getMockPlaces(center: Coordinates): MockPlace[] {
  return MOCK_PLACE_OFFSETS.map(({ latOffset, lngOffset, ...place }) => ({
    ...place,
    lat: center.lat + latOffset,
    lng: center.lng + lngOffset,
  }));
}

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** 두 좌표 사이 직선 거리(km, 소수 1자리). Haversine 공식. */
export function getDistanceKm(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const distanceKm = 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
  return Math.round(distanceKm * 10) / 10;
}
