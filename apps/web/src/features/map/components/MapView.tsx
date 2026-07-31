import type { Ref } from 'react';
import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Container as MapDiv, NaverMap, useNavermaps } from 'react-naver-maps';
import { CurrentLocationDot } from '@/features/map/components/CurrentLocationDot';
import { PlacePin } from '@/features/map/components/PlacePin';
import { SELECTED_PLACE_VERTICAL_RATIO } from '@/features/map/constants';
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
 *
 * 선택 장소로의 이동은 명령형 호출이 아니라 `panTarget` prop 으로 받는다.
 * 이 컴포넌트는 지도 스크립트 로드까지 Suspense 로 마운트가 밀리기 때문에
 * (`useNavermaps` 가 스크립트 로드 promise 를 `use()` 한다), 특정 순간에 한 번
 * 발사되는 명령은 지도가 아직 없으면 그대로 유실된다 — prop 은 유실되지 않으므로
 * "지도 인스턴스 생성 ∧ 타깃 존재"가 되는 순간 아래 effect 가 이동을 적용한다.
 */
export function MapView({
  pins,
  currentLocation,
  initialCenter,
  selectedPlaceId,
  panTarget,
  onPlaceClick,
  onBoundsChanged,
  ref,
}: {
  pins: MapPin[];
  currentLocation: Coordinates | null;
  initialCenter?: Coordinates;
  selectedPlaceId?: number | null;
  /**
   * 지도가 보여줘야 할 선택 장소 좌표. 값이 있으면 그 좌표가 드로어에 가려지지 않는
   * 화면 위쪽 영역 정가운데(`SELECTED_PLACE_VERTICAL_RATIO`)에 오도록 이동한다.
   * 좌표(lat/lng 값)가 바뀔 때마다, 그리고 지도 인스턴스가 늦게 생겨도 그 시점에 적용된다.
   */
  panTarget?: Coordinates | null;
  onPlaceClick?: (id: number) => void;
  /** 지도가 멈춘(idle) 시점의 실제 뷰포트 경계 — 팬/줌이 끝날 때만 넘어온다(최초 마운트 포함). */
  onBoundsChanged?: (bounds: MapBounds) => void;
  ref?: Ref<MapViewHandle>;
}) {
  const navermaps = useNavermaps();
  const center = initialCenter ?? FALLBACK_CENTER;
  // 인스턴스를 ref(이벤트 핸들러의 동기 접근용)와 state(effect 트리거용) 양쪽에 든다.
  // ref 만 쓰면 인스턴스가 "생긴 순간"을 React 가 알 수 없어, 그 전에 도착해 있던
  // panTarget 을 적용할 재렌더/재실행이 일어나지 않는다.
  const mapRef = useRef<naver.maps.Map | null>(null);
  const [map, setMap] = useState<naver.maps.Map | null>(null);
  const attachMap = useCallback((instance: naver.maps.Map | null) => {
    mapRef.current = instance;
    setMap(instance);
  }, []);

  // 현재 위치 버튼을 누른 횟수 — 값이 바뀔 때마다 위치 마커의 파장이 다시 재생된다.
  const [recenterCount, setRecenterCount] = useState(0);

  useImperativeHandle(
    ref,
    () => ({
      recenter: () => {
        const currentMap = mapRef.current;
        if (!currentMap) return;
        currentMap.setCenter(new navermaps.LatLng(center.lat, center.lng));
        currentMap.setZoom(DEFAULT_ZOOM);
        setRecenterCount((prev) => prev + 1);
      },
    }),
    [navermaps, center.lat, center.lng],
  );

  // 객체 identity 가 아니라 좌표 값으로 반응한다 — 호출부가 매 렌더 새 객체를 내려도
  // 좌표가 같으면 다시 이동하지 않는다.
  const panTargetLat = panTarget?.lat;
  const panTargetLng = panTarget?.lng;
  useEffect(() => {
    if (!map || panTargetLat === undefined || panTargetLng === undefined) return;
    const target = new navermaps.LatLng(panTargetLat, panTargetLng);
    // 그냥 target 을 중심으로 잡으면 화면 정중앙(드로어 경계 부근)에 와서 가려지므로,
    // target 이 SELECTED_PLACE_VERTICAL_RATIO 높이에 보이도록 중심 좌표를 그만큼
    // 아래로 옮겨 잡는다(픽셀 오프셋 계산은 지도 투영(projection)에 위임한다).
    const projection = map.getProjection();
    const verticalShiftPx = map.getSize().height * (SELECTED_PLACE_VERTICAL_RATIO - 0.5);
    const targetOffset = projection.fromCoordToOffset(target);
    const shiftedOffset = new navermaps.Point(targetOffset.x, targetOffset.y + verticalShiftPx);
    map.panTo(projection.fromOffsetToCoord(shiftedOffset));
  }, [map, navermaps, panTargetLat, panTargetLng]);

  return (
    <MapDiv style={{ width: '100%', height: '100%' }}>
      <NaverMap
        ref={attachMap}
        defaultCenter={new navermaps.LatLng(center.lat, center.lng)}
        defaultZoom={DEFAULT_ZOOM}
        onIdle={() => {
          const currentMap = mapRef.current;
          if (!currentMap || !onBoundsChanged) return;
          // 이 지도는 경위도 좌표계만 쓰므로 런타임엔 항상 LatLngBounds다(PointBounds 는
          // 픽셀 좌표계 지도 전용). naver 타입 선언은 둘의 유니온(Bounds)만 노출한다.
          const bounds = currentMap.getBounds() as naver.maps.LatLngBounds;
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
            name={pin.name}
            color={pin.color}
            selected={pin.id === selectedPlaceId}
            onClick={() => onPlaceClick?.(pin.id)}
          />
        ))}
        {currentLocation && (
          <CurrentLocationDot
            lat={currentLocation.lat}
            lng={currentLocation.lng}
            rippleKey={recenterCount}
          />
        )}
      </NaverMap>
    </MapDiv>
  );
}
