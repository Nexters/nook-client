import type { Ref } from 'react';
import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Container as MapDiv, NaverMap, useNavermaps } from 'react-naver-maps';
import { ClusterBubble } from '@/features/map/components/ClusterBubble';
import { CurrentLocationDot } from '@/features/map/components/CurrentLocationDot';
import { PlacePin } from '@/features/map/components/PlacePin';
import {
  CLUSTER_ZOOM_STEP,
  DEFAULT_ZOOM,
  DETAIL_PAGE_SNAP_POINT,
  PIN_DETAIL_MIN_ZOOM,
  RECENTER_ZOOM,
} from '@/features/map/constants';
import { buildNaverMapStyleProps, resolveMapStyle } from '@/features/map/map-style';
import { clusterPins } from '@/features/map/pin-cluster';
import { attachPinchPan } from '@/features/map/pinch-pan';
import type { MapBounds, MapPin } from '@/features/map/types';
import type { Coordinates } from '@/shared/lib/geolocation';

const FALLBACK_CENTER = { lat: 37.5729, lng: 126.9762 }; // 위치 못 가져왔을 때 광화문 인근 폴백

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
  sheetSnap = DETAIL_PAGE_SNAP_POINT,
  onPlaceClick,
  onBoundsChanged,
  ref,
}: {
  pins: MapPin[];
  currentLocation: Coordinates | null;
  initialCenter?: Coordinates;
  selectedPlaceId?: number | null;
  /**
   * 지도가 보여줘야 할 선택 장소 좌표. 값이 있으면 핀 사진이 보이는 줌(`PIN_DETAIL_MIN_ZOOM`)
   * 까지 확대하면서, 그 좌표가 드로어에 가려지지 않는 화면 위쪽 영역 정가운데에 오도록 이동한다.
   * 좌표(lat/lng 값)가 바뀔 때마다, 그리고 지도 인스턴스가 늦게 생겨도 그 시점에 적용된다.
   */
  panTarget?: Coordinates | null;
  /**
   * 이동하는 순간 드로어가 가리는 화면 비율(스냅 포인트 표기). 사진 없는 장소는 detailCompact
   * 로 낮게 열려서, 고정값(detailPage)으로 잡으면 핀이 보이는 영역 가운데에 오지 않는다.
   * 이동 시점의 값만 쓴다 — 시트를 끌어 올리고 내리는 동안 지도가 따라 움직이지 않게.
   */
  sheetSnap?: number;
  onPlaceClick?: (id: number) => void;
  /** 지도가 멈춘(idle) 시점의 실제 뷰포트 경계 — 팬/줌이 끝날 때만 넘어온다(최초 마운트 포함). */
  onBoundsChanged?: (bounds: MapBounds) => void;
  ref?: Ref<MapViewHandle>;
}) {
  const navermaps = useNavermaps();
  // 지도 스타일(GL+커스텀 스타일 또는 라벨 뺀 래스터)은 map-style 에서 한 번 정한다. raster 모드의
  // MapTypeRegistry 는 매 렌더 새로 만들면 지도 유형이 계속 재설정되므로 memo 로 고정한다.
  const styleProps = useMemo(
    () => buildNaverMapStyleProps(navermaps, resolveMapStyle()),
    [navermaps],
  );
  const center = initialCenter ?? FALLBACK_CENTER;
  // 인스턴스를 ref(이벤트 핸들러의 동기 접근용)와 state(effect 트리거용) 양쪽에 든다.
  // ref 만 쓰면 인스턴스가 "생긴 순간"을 React 가 알 수 없어, 그 전에 도착해 있던
  // panTarget 을 적용할 재렌더/재실행이 일어나지 않는다.
  const mapRef = useRef<naver.maps.Map | null>(null);
  const [map, setMap] = useState<naver.maps.Map | null>(null);
  // 클러스터/개별 핀 모드 판단용. 줌 제스처 중간값까지 따라갈 필요는 없어서(클러스터가
  // 깜빡이며 재구성되는 게 더 어수선하다) idle 시점 값만 쓴다.
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
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
        // 초기 줌이 아니라 "내 주변" 축척으로 당긴다(`RECENTER_ZOOM`).
        currentMap.setZoom(RECENTER_ZOOM);
        setRecenterCount((prev) => prev + 1);
      },
    }),
    [navermaps, center.lat, center.lng],
  );

  // 객체 identity 가 아니라 좌표 값으로 반응한다 — 호출부가 매 렌더 새 객체를 내려도
  // 좌표가 같으면 다시 이동하지 않는다.
  const panTargetLat = panTarget?.lat;
  const panTargetLng = panTarget?.lng;
  const sheetSnapRef = useRef(sheetSnap);
  sheetSnapRef.current = sheetSnap;
  useEffect(() => {
    if (!map || panTargetLat === undefined || panTargetLng === undefined) return;
    const target = new navermaps.LatLng(panTargetLat, panTargetLng);
    // 그냥 target 을 중심으로 잡으면 화면 정중앙(드로어 경계 부근)에 와서 가려지므로,
    // target 이 드로어 위 남은 영역의 정가운데((1 + snap) / 2 높이)에 보이도록 중심 좌표를
    // 그만큼 아래로 옮겨 잡는다(픽셀 오프셋 계산은 지도 투영(projection)에 위임한다).
    // 전체 높이(full)로 복원된 시트는 가리지 않은 영역이 없어 기본 높이 기준으로 둔다.
    const snap = sheetSnapRef.current < 1 ? sheetSnapRef.current : DETAIL_PAGE_SNAP_POINT;
    const currentZoom = map.getZoom();
    // 이미 더 확대해 보고 있었다면 그 축척을 존중한다 — 줌 아웃시키지 않는다.
    const targetZoom = Math.max(currentZoom, PIN_DETAIL_MIN_ZOOM);
    // 투영은 현재 줌의 픽셀 좌표계다. 도착 줌에서 필요한 화면 픽셀만큼 옮기려면 줌 차이만큼
    // 줄여 환산한다(줌 1단계 = 2배).
    const verticalShiftPx =
      map.getSize().height * ((1 + snap) / 2 - 0.5) * 2 ** (currentZoom - targetZoom);
    const projection = map.getProjection();
    const targetOffset = projection.fromCoordToOffset(target);
    const shiftedOffset = new navermaps.Point(targetOffset.x, targetOffset.y + verticalShiftPx);
    const destination = projection.fromOffsetToCoord(shiftedOffset);
    if (targetZoom === currentZoom) map.panTo(destination);
    else map.morph(destination, targetZoom);
  }, [map, navermaps, panTargetLat, panTargetLng]);

  // 핀치하면서 손가락을 옮기면 지도도 따라 움직이게 한다 — SDK 는 핀치 시작점을 줌 원점으로
  // 고정하고 이후 중심 이동을 버린다(pinch-pan.ts 참고). 지도 인스턴스가 생길 때 붙이고 바뀌면 뗀다.
  useEffect(() => {
    if (!map) return;
    return attachPinchPan(map, navermaps);
  }, [map, navermaps]);

  // 버블을 누르면 그 덩어리 쪽으로 이동하면서 한 단계 확대한다. 최대 줌 초과는 네이버가
  // 알아서 클램프하므로 여기서 상한을 따로 두지 않는다.
  // 장소가 하나뿐인 버블은 더 쪼갤 게 없다 — 단계를 밟지 않고 핀 사진이 보이는 줌까지
  // 곧장 당기고, 그 장소를 화면 가운데 둔다. 선택(시트 열기)은 하지 않는다(QA).
  const zoomIntoCluster = useCallback(
    (lat: number, lng: number, single: boolean) => {
      const currentMap = mapRef.current;
      if (!currentMap) return;
      const zoom = currentMap.getZoom();
      currentMap.morph(
        new navermaps.LatLng(lat, lng),
        single ? PIN_DETAIL_MIN_ZOOM : zoom + CLUSTER_ZOOM_STEP,
      );
    },
    [navermaps],
  );

  // 선택된 핀은 클러스터에서 빼고 줌과 무관하게 항상 물방울로 그린다 — 방금 고른 장소가
  // 버블 속에 숨어버리면 안 된다.
  const selectedPin =
    selectedPlaceId === null || selectedPlaceId === undefined
      ? undefined
      : pins.find((pin) => pin.id === selectedPlaceId);
  const restPins = selectedPin ? pins.filter((pin) => pin.id !== selectedPin.id) : pins;

  return (
    <MapDiv style={{ width: '100%', height: '100%' }}>
      <NaverMap
        ref={attachMap}
        defaultCenter={new navermaps.LatLng(center.lat, center.lng)}
        defaultZoom={DEFAULT_ZOOM}
        {...styleProps}
        onIdle={() => {
          const currentMap = mapRef.current;
          if (!currentMap) return;
          setZoom(currentMap.getZoom());
          if (!onBoundsChanged) return;
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
        {zoom < PIN_DETAIL_MIN_ZOOM
          ? clusterPins(restPins, zoom).map((cluster) => (
              <ClusterBubble
                key={cluster.key}
                lat={cluster.lat}
                lng={cluster.lng}
                count={cluster.pins.length}
                onClick={() => {
                  const [only] = cluster.pins;
                  if (cluster.pins.length === 1 && only) zoomIntoCluster(only.lat, only.lng, true);
                  else zoomIntoCluster(cluster.lat, cluster.lng, false);
                }}
              />
            ))
          : restPins.map((pin) => (
              <PlacePin
                key={pin.id}
                lat={pin.lat}
                lng={pin.lng}
                name={pin.name}
                color={pin.color}
                thumbnail={pin.thumbnail}
                onClick={() => onPlaceClick?.(pin.id)}
              />
            ))}
        {selectedPin && (
          <PlacePin
            key={selectedPin.id}
            lat={selectedPin.lat}
            lng={selectedPin.lng}
            name={selectedPin.name}
            color={selectedPin.color}
            thumbnail={selectedPin.thumbnail}
            categoryGroup={selectedPin.categoryGroup}
            selected
            onClick={() => onPlaceClick?.(selectedPin.id)}
          />
        )}
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
