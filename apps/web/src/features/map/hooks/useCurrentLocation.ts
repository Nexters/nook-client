import { useEffect, useState } from 'react';
import type { Coordinates } from '@/shared/lib/geolocation';
import { getCurrentPosition } from '@/shared/lib/geolocation';

export type CurrentLocationState =
  | { status: 'loading' }
  | { status: 'resolved'; coords: Coordinates | null };

/**
 * 마운트 시 1회 현재 위치를 조회한다. `loading` 동안은 아직 응답 전이라는 뜻이고,
 * `resolved` 이후 `coords` 가 null 이면 권한 거부/오류로 위치를 못 가져온 것이다.
 * 지도를 내 위치로 초기 센터링하려면 loading 이 끝날 때까지 지도 마운트를 미뤄야 한다 —
 * `defaultCenter` 는 최초 마운트 시점에만 반영되는 값이라 나중에 갱신해도 소용없다.
 */
export function useCurrentLocation(): CurrentLocationState {
  const [state, setState] = useState<CurrentLocationState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    getCurrentPosition().then((coords) => {
      if (!cancelled) setState({ status: 'resolved', coords });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
