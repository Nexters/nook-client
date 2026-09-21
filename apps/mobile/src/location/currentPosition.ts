import type { GeoCoordinates } from '@nook/bridge-contracts';
import * as Location from 'expo-location';

// 웹 어댑터(geolocation.ts)의 maximumAge·timeout 과 같은 값. 브리지는 옵션을 받지 않으므로
// 여기서 같은 규칙을 지킨다 — 캐시를 버리고 새 위치만 기다리면 Android 실기기에서 다음
// 갱신까지 20~30초 멈추던 문제(NOOK-360)가 셸 경로에서 되살아난다.
const MAX_POSITION_AGE_MS = 5 * 60 * 1000;
const POSITION_TIMEOUT_MS = 8_000;

function toCoordinates(position: Location.LocationObject): GeoCoordinates {
  return { lat: position.coords.latitude, lng: position.coords.longitude };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
    );
  });
}

/**
 * 현재 위치를 OS 위치 API 로 조회한다. 미결정 상태면 OS 권한 다이얼로그가 뜨고, 그 답은
 * OS 가 기억하므로 다음 기동부터는 묻지 않는다. 거부·위치 서비스 꺼짐·조회 실패·상한 초과는
 * 모두 null 이다 — 웹은 그 경우 기본 위치로 지도를 연다.
 */
export async function getCurrentPosition(): Promise<GeoCoordinates | null> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return null;

    const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: MAX_POSITION_AGE_MS });
    if (lastKnown) return toCoordinates(lastKnown);

    // 지도 초기 센터·거리 표기 용도라 GPS 정밀도까지는 필요 없다. Balanced 가 실내에서도
    // 빨리 돌아온다.
    const position = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      POSITION_TIMEOUT_MS,
    );
    return position ? toCoordinates(position) : null;
  } catch {
    return null;
  }
}
