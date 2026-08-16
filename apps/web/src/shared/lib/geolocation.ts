export type Coordinates = { lat: number; lng: number };

/**
 * 브라우저 Geolocation API 를 감싼 어댑터.
 * 권한 거부/미지원/오류 시 null 을 반환해 호출부가 조용히(다이얼로그 없이) 처리하게 한다.
 *
 * Expo(RN) 셸에서는 WebView 가 이 API 를 그대로 프록시한다(Android: WebView
 * `geolocationEnabled` prop, iOS: WKWebView 가 Info.plist 권한 설명을 보고 자체
 * 처리) — 네이티브 브리지 메시지 없이 웹 표준 API 만으로 동작한다.
 */
const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** 두 좌표 사이 직선 거리(km). Haversine 공식. */
function distanceKm(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** 두 좌표 사이 직선 거리(km, 소수 1자리). */
export function getDistanceKm(a: Coordinates, b: Coordinates): number {
  return Math.round(distanceKm(a, b) * 10) / 10;
}

/**
 * 미터 거리 → 표기(시안 `4.6km`·`400m`).
 * 1km 미만은 m 단위로 보여준다 — 미터로 먼저 반올림해야 999.6m 가 `1000m` 로 새지 않는다.
 * 서버가 미터를 그대로 내려주는 응답(장소 검색 `distanceMeters`)에도 같은 표기를 쓴다.
 */
export function formatDistanceFromMeters(meters: number): string {
  const rounded = Math.round(meters);
  return rounded < 1000 ? `${rounded}m` : `${Math.round(rounded / 100) / 10}km`;
}

/** 두 좌표 사이 거리 표기 — `formatDistanceFromMeters` 와 같은 규칙. */
export function formatDistance(a: Coordinates, b: Coordinates): string {
  return formatDistanceFromMeters(distanceKm(a, b) * 1000);
}

export function getCurrentPosition(): Promise<Coordinates | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({ lat: position.coords.latitude, lng: position.coords.longitude });
      },
      () => {
        resolve(null);
      },
    );
  });
}
