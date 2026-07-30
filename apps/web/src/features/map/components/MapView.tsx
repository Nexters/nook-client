import type { Ref } from 'react';
import { useImperativeHandle, useRef } from 'react';
import { Container as MapDiv, NaverMap, useNavermaps } from 'react-naver-maps';
import { CurrentLocationDot } from '@/features/map/components/CurrentLocationDot';
import { PlacePin } from '@/features/map/components/PlacePin';
import type { MapBounds, MapPin } from '@/features/map/types';
import type { Coordinates } from '@/shared/lib/geolocation';

const FALLBACK_CENTER = { lat: 37.5729, lng: 126.9762 }; // 위치 못 가져왔을 때 광화문 인근 폴백
// 확대 정도는 여기서 조정한다. 네이버 지도는 숫자가 클수록 더 확대된다(대략 1~21).
const DEFAULT_ZOOM = 18;

export type MapViewHandle = {
  /** 지도를 초기 중심 좌표·줌으로 되돌린다(현재 위치 버튼용). */
  recenter: () => void;
};

/**
 * 네이버 지도 렌더링 지점. 앱의 다른 곳에서는 `react-naver-maps` 를 직접
 * import 하지 않고 이 컴포넌트를 통해서만 지도에 접근한다.
 *
 * `initialCenter` 는 최초 마운트 시점에만 반영된다(uncontrolled). 마운트 이후
 * 값이 바뀌어도 지도는 재센터링되지 않으니, 위치를 알고 나서 지도를 마운트해야 한다.
 * 재센터링은 `ref.recenter()` 로 명령형 호출한다(naver.maps.Map 인스턴스에 직접 명령).
 */
export function MapView({
  pins,
  currentLocation,
  initialCenter,
  selectedPlaceId,
  onPlaceClick,
  onBoundsChanged,
  ref,
}: {
  pins: MapPin[];
  currentLocation: Coordinates | null;
  initialCenter?: Coordinates;
  selectedPlaceId?: number | null;
  onPlaceClick?: (id: number) => void;
  /** 지도가 멈춘(idle) 시점의 실제 뷰포트 경계 — 팬/줌이 끝날 때만 넘어온다(최초 마운트 포함). */
  onBoundsChanged?: (bounds: MapBounds) => void;
  ref?: Ref<MapViewHandle>;
}) {
  const navermaps = useNavermaps();
  const center = initialCenter ?? FALLBACK_CENTER;
  const mapRef = useRef<naver.maps.Map | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      recenter: () => {
        const map = mapRef.current;
        if (!map) return;
        map.setCenter(new navermaps.LatLng(center.lat, center.lng));
        map.setZoom(DEFAULT_ZOOM);
      },
    }),
    [navermaps, center.lat, center.lng],
  );

  return (
    <MapDiv style={{ width: '100%', height: '100%' }}>
      <NaverMap
        ref={mapRef}
        defaultCenter={new navermaps.LatLng(center.lat, center.lng)}
        defaultZoom={DEFAULT_ZOOM}
        onIdle={() => {
          const map = mapRef.current;
          if (!map || !onBoundsChanged) return;
          // 이 지도는 경위도 좌표계만 쓰므로 런타임엔 항상 LatLngBounds다(PointBounds 는
          // 픽셀 좌표계 지도 전용). naver 타입 선언은 둘의 유니온(Bounds)만 노출한다.
          const bounds = map.getBounds() as naver.maps.LatLngBounds;
          onBoundsChanged({
            north: bounds.north(),
            south: bounds.south(),
            east: bounds.east(),
            west: bounds.west(),
          });
        }}
      >
        {pins.map((pin) => (
          <PlacePin
            key={pin.id}
            lat={pin.lat}
            lng={pin.lng}
            selected={pin.id === selectedPlaceId}
            onClick={() => onPlaceClick?.(pin.id)}
          />
        ))}
        {currentLocation && (
          <CurrentLocationDot lat={currentLocation.lat} lng={currentLocation.lng} />
        )}
      </NaverMap>
    </MapDiv>
  );
}
