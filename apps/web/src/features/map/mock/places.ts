import type { PlacePinColor } from '@/features/map/components/PlacePin';
import type { Coordinates } from '@/shared/native/geolocation';

export type SavedPost = {
  id: string;
  excerpt: string;
  author: string;
};

export type MockPlace = {
  id: string;
  name: string;
  category: string;
  region: string;
  address: string;
  tags: string[];
  hours: string;
  memo: string;
  savedPosts: SavedPost[];
  lat: number;
  lng: number;
  color: PlacePinColor;
};

type MockPlaceOffset = Omit<MockPlace, 'lat' | 'lng'> & {
  /** 현재 위치 기준 위도/경도 오프셋(도). 대략 반경 100~350m 안에 흩어놓는다. */
  latOffset: number;
  lngOffset: number;
};

/**
 * 지도 스파이크/뼈대 검증용 목데이터. API 스펙 확정 전까지 임시로 사용한다.
 * 절대 좌표 대신 현재 위치 기준 오프셋으로 두어, 실기기/브라우저의 실제 위치가
 * 어디든 핀들이 화면 안에 보이도록 한다 (`getMockPlaces` 참고).
 */
const MOCK_PLACE_OFFSETS: MockPlaceOffset[] = [
  {
    id: '1',
    name: '하우스 오브 와일드',
    category: '카페',
    region: '서울',
    address: '서울 성동구 서울숲 4길 12',
    tags: ['조용한', '뷰 맛집'],
    hours: '10:00 - 20:00',
    memo: '창가 자리가 좋다',
    savedPosts: [
      { id: 'p1', excerpt: '조용히 작업하기 좋은 공간, 창밖 뷰가 예쁘다.', author: 'by Nook' },
      {
        id: 'p2',
        excerpt: '드립커피 향이 좋았다. 다음엔 디저트도 먹어보고 싶다.',
        author: 'by Nook',
      },
    ],
    color: 'yellow',
    latOffset: 0.0006,
    lngOffset: -0.0009,
  },
  {
    id: '2',
    name: '퍼머넌트해비탯',
    category: '카페',
    region: '서울',
    address: '서울 성동구 서울숲 7길 9 4층',
    tags: ['정갈한', '혼밥', '친절한'],
    hours: '11:00 - 19:30',
    memo: '',
    savedPosts: [
      {
        id: 'p1',
        excerpt: '북적이는 성수에서 여유로운 카페를 찾고 있다면 망설임 없이 추천.',
        author: 'by Purr',
      },
      {
        id: 'p2',
        excerpt: '라떼가 부드럽고 자리 간격이 넓어서 오래 앉아있기 좋았다.',
        author: 'by Purr',
      },
    ],
    color: 'red',
    latOffset: 0.0022,
    lngOffset: 0.0006,
  },
  {
    id: '3',
    name: '세터커피',
    category: '카페',
    region: '서울',
    address: '서울 성동구 성수이로20길 33',
    tags: ['작업하기 좋은', '넓은'],
    hours: '09:00 - 21:00',
    memo: '콘센트 자리 확인하기',
    savedPosts: [
      { id: 'p1', excerpt: '테이블이 넓고 콘센트가 많아 노트북 작업하기 좋다.', author: 'by Nook' },
    ],
    color: 'purple',
    latOffset: -0.0023,
    lngOffset: 0.0017,
  },
  {
    id: '4',
    name: '비터앤츠',
    category: '베이커리',
    region: '서울',
    address: '서울 성동구 뚝섬로1길 5',
    tags: ['달콤한', '아침 일찍'],
    hours: '08:00 - 18:00',
    memo: '소금빵이 맛있다',
    savedPosts: [
      { id: 'p1', excerpt: '오전 일찍 가야 원하는 빵을 다 살 수 있다.', author: 'by Nook' },
      { id: 'p2', excerpt: '소금빵과 크루아상이 특히 인기.', author: 'by Nook' },
    ],
    color: 'sky',
    latOffset: 0.0032,
    lngOffset: -0.0007,
  },
];

/**
 * 목데이터 오프셋을 실제 중심 좌표(현재 위치 또는 폴백) 기준으로 환산한다.
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
