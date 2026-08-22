import { DEFAULT_ZOOM } from '@/features/map/constants';
import type { MapBounds } from '@/features/map/types';
import type { Coordinates } from '@/shared/lib/geolocation';

/** 웹 메르카토르 적도 해상도(zoom 0 · 256px 타일 기준 m/px). 네이버 지도도 같은 스케일이다. */
const EQUATOR_METERS_PER_PIXEL = 156_543.03392;
/** 위도 1° 의 거리(m). 경도 1° 는 위도에 따라 cos 배로 짧아진다. */
const METERS_PER_LATITUDE_DEGREE = 111_320;

/**
 * 지도의 첫 idle 이 오기 전에 쓰는 근사 경계 — 초기 줌에서 화면이 덮는 만큼을 계산한다.
 *
 * 실제 경계는 지도가 idle 될 때 덮어쓰므로 정확할 필요는 없다. 다만 화면보다 좁으면 첫 핀
 * 조회에서 화면 안 핀이 빠져 한 박자 늦게 채워지므로, 고정 상수를 두지 않고 줌·뷰포트에서
 * 파생한다 — `DEFAULT_ZOOM` 을 멀리 조정할수록 이 차이가 커지기 때문이다(초기엔 ±1.1km
 * 고정값이었는데, 초기 줌이 광역으로 내려가면서 화면의 수십분의 일만 덮게 됐다).
 */
export function toInitialBounds(
  center: Coordinates,
  {
    zoom = DEFAULT_ZOOM,
    width = window.innerWidth,
    height = window.innerHeight,
  }: { zoom?: number; width?: number; height?: number } = {},
): MapBounds {
  const latitudeRadians = (center.lat * Math.PI) / 180;
  const metersPerPixel = (EQUATOR_METERS_PER_PIXEL * Math.cos(latitudeRadians)) / 2 ** zoom;
  const latitudeDelta = ((height / 2) * metersPerPixel) / METERS_PER_LATITUDE_DEGREE;
  const longitudeDelta =
    ((width / 2) * metersPerPixel) / (METERS_PER_LATITUDE_DEGREE * Math.cos(latitudeRadians));

  return {
    north: center.lat + latitudeDelta,
    south: center.lat - latitudeDelta,
    east: center.lng + longitudeDelta,
    west: center.lng - longitudeDelta,
  };
}
