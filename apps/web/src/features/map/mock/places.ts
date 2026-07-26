import type { PlacePinColor } from '@/features/map/components/PlacePin';

export type MockPlace = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  color: PlacePinColor;
};

/**
 * 지도 스파이크/뼈대 검증용 목데이터. 시안(광화문 인근)과 비교하기 쉽도록
 * 같은 지역 좌표를 썼다. API 스펙 확정 전까지 임시로 사용한다.
 */
export const MOCK_PLACES: MockPlace[] = [
  { id: '1', name: '하우스 오브 와일드', lat: 37.5729, lng: 126.9762, color: 'yellow' },
  { id: '2', name: '퍼머넌트해비탯', lat: 37.5751, lng: 126.9768, color: 'red' },
  { id: '3', name: '세터커피', lat: 37.5706, lng: 126.9779, color: 'purple' },
  { id: '4', name: '비터앤츠', lat: 37.5761, lng: 126.9755, color: 'sky' },
];
