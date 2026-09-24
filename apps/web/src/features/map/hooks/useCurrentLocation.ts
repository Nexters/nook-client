import { useEffect, useState } from 'react';
import type { Coordinates } from '@/shared/lib/geolocation';
import { getCurrentPosition } from '@/shared/lib/geolocation';

export type CurrentLocationState =
  | { status: 'loading' }
  | { status: 'resolved'; coords: Coordinates | null };

/**
 * 마지막으로 얻은 좌표. 지도를 나갔다 다시 들어오면 위치 조회를 기다리지 않고 이 값으로
 * 바로 마운트한다 — 브라우저 캐시(`maximumAge`)만으로는 로딩 상태를 한 번 거치는데, 그
 * 사이 지도가 통째로 빠졌다 다시 그려진다. 뒤에서 다시 조회해 현재 위치 점·재센터링 좌표는
 * 최신 값으로 갱신하므로 낡은 값에 묶이지 않는다.
 */
let lastKnownCoords: Coordinates | null = null;

/**
 * 마운트 시 1회 현재 위치를 조회한다. `loading` 동안은 아직 응답 전이라는 뜻이고,
 * `resolved` 이후 `coords` 가 null 이면 권한 거부/오류로 위치를 못 가져온 것이다.
 * 지도를 내 위치로 초기 센터링하려면 loading 이 끝날 때까지 지도 마운트를 미뤄야 한다 —
 * `defaultCenter` 는 최초 마운트 시점에만 반영되는 값이라 나중에 갱신해도 소용없다.
 */
export function useCurrentLocation(): CurrentLocationState {
  const [state, setState] = useState<CurrentLocationState>(() =>
    lastKnownCoords ? { status: 'resolved', coords: lastKnownCoords } : { status: 'loading' },
  );

  useEffect(() => {
    let cancelled = false;
    getCurrentPosition().then((coords) => {
      if (coords) lastKnownCoords = coords;
      // 재조회가 실패해도 이미 알던 좌표를 null 로 덮어 현재 위치 점을 지우지 않는다.
      if (!cancelled) setState({ status: 'resolved', coords: coords ?? lastKnownCoords });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
