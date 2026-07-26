import { Container as MapDiv, NaverMap, useNavermaps } from 'react-naver-maps';
import { CurrentLocationDot } from '@/features/map/components/CurrentLocationDot';
import { PlacePin } from '@/features/map/components/PlacePin';
import type { MockPlace } from '@/features/map/mock/places';
import type { Coordinates } from '@/shared/native/geolocation';

const FALLBACK_CENTER = { lat: 37.5729, lng: 126.9762 }; // 위치 못 가져왔을 때 광화문 인근 폴백
// 확대 정도는 여기서 조정한다. 네이버 지도는 숫자가 클수록 더 확대된다(대략 1~21).
const DEFAULT_ZOOM = 18;

/**
 * 네이버 지도 렌더링 지점. 앱의 다른 곳에서는 `react-naver-maps` 를 직접
 * import 하지 않고 이 컴포넌트를 통해서만 지도에 접근한다.
 *
 * `initialCenter` 는 최초 마운트 시점에만 반영된다(uncontrolled). 마운트 이후
 * 값이 바뀌어도 지도는 재센터링되지 않으니, 위치를 알고 나서 지도를 마운트해야 한다.
 */
export function MapView({
  places,
  currentLocation,
  initialCenter,
}: {
  places: MockPlace[];
  currentLocation: Coordinates | null;
  initialCenter?: Coordinates;
}) {
  const navermaps = useNavermaps();
  const center = initialCenter ?? FALLBACK_CENTER;

  return (
    <MapDiv style={{ width: '100%', height: '100%' }}>
      <NaverMap
        defaultCenter={new navermaps.LatLng(center.lat, center.lng)}
        defaultZoom={DEFAULT_ZOOM}
      >
        {places.map((place) => (
          <PlacePin
            key={place.id}
            lat={place.lat}
            lng={place.lng}
            name={place.name}
            color={place.color}
          />
        ))}
        {currentLocation && (
          <CurrentLocationDot lat={currentLocation.lat} lng={currentLocation.lng} />
        )}
      </NaverMap>
    </MapDiv>
  );
}
