import type { Ref } from 'react';
import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Container as MapDiv, NaverMap, useNavermaps } from 'react-naver-maps';
import { ClusterBubble } from '@/features/map/components/ClusterBubble';
import { CurrentLocationDot } from '@/features/map/components/CurrentLocationDot';
import { PlacePin } from '@/features/map/components/PlacePin';
import {
  DEFAULT_ZOOM,
  DETAIL_PAGE_SNAP_POINT,
  PIN_DETAIL_MIN_ZOOM,
  RECENTER_ZOOM,
  SELECTED_PIN_VISIBLE_AREA_RATIO,
  SELECTED_PLACE_MOVE_DURATION_MS,
} from '@/features/map/constants';
import { buildNaverMapStyleProps, resolveMapStyle } from '@/features/map/map-style';
import { clusterPins, zoomToFitSpan } from '@/features/map/pin-cluster';
import { attachPinchPan } from '@/features/map/pinch-pan';
import type { MapBounds, MapPin } from '@/features/map/types';
import type { Coordinates } from '@/shared/lib/geolocation';

const FALLBACK_CENTER = { lat: 37.5729, lng: 126.9762 }; // 위치 못 가져왔을 때 광화문 인근 폴백
/** 선택 장소 이동 애니메이션이 끝났어야 할 시점에서 도착을 확인하기까지 더 기다리는 여유(ms). */
const MOVE_SETTLE_GRACE_MS = 300;
/** 클러스터를 확대해 멤버를 화면에 맞출 때 가장자리 여백 — 핀(48px)·이름표가 잘리지 않을 만큼. */
const CLUSTER_FIT_PADDING_PX = 48;
/** 화면 위쪽을 덮는 로고 헤더 + safe area 몫. 그 아래만 멤버를 맞출 영역으로 친다. */
const CLUSTER_FIT_TOP_INSET_PX = 100;

/**
 * 마지막으로 멈춘 지도 시점(중심·줌). 지도 화면은 다른 탭으로 가면 언마운트되는데, 돌아올 때마다
 * 내 위치·기본 줌에서 다시 시작하면 아카이브에서 장소를 고른 경우만 "기본 줌에서 확 당겨지는"
 * 이동이 된다(QA) — 앱 프로세스가 살아 있는 동안은 보던 시점에서 이어서 연다.
 */
let lastCamera: { center: Coordinates; zoom: number; clusterZoom: number } | null = null;

export function getLastMapCamera() {
  return lastCamera;
}

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
  onEmptyMapClick,
  onBoundsChanged,
  onDestinationBounds,
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
  /** 핀·클러스터가 아닌 지도 바닥을 탭했을 때(드래그·핀치는 제외 — 네이버가 click 을 안 쏜다). */
  onEmptyMapClick?: () => void;
  /** 지도가 멈춘(idle) 시점의 실제 뷰포트 경계 — 팬/줌이 끝날 때만 넘어온다(최초 마운트 포함). */
  onBoundsChanged?: (bounds: MapBounds) => void;
  /**
   * 선택 장소로 이동을 시작하는 순간, 도착했을 때 보일 뷰포트 경계. 도착(idle)을 기다리지 않고
   * 목적지 핀을 미리 받아 두라는 신호다 — 받아 두면 도착할 즈음 핀이 이미 떠 있다.
   */
  onDestinationBounds?: (bounds: MapBounds) => void;
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
  // 마운트 시점의 복원 시점 — 이후 idle 로 lastCamera 가 바뀌어도 default 값은 고정이어야 한다.
  const [restoredCamera] = useState(lastCamera);
  // 인스턴스를 ref(이벤트 핸들러의 동기 접근용)와 state(effect 트리거용) 양쪽에 든다.
  // ref 만 쓰면 인스턴스가 "생긴 순간"을 React 가 알 수 없어, 그 전에 도착해 있던
  // panTarget 을 적용할 재렌더/재실행이 일어나지 않는다.
  const mapRef = useRef<naver.maps.Map | null>(null);
  const [map, setMap] = useState<naver.maps.Map | null>(null);
  // 클러스터/개별 핀 모드 판단용. 줌 제스처 중간값까지 따라갈 필요는 없어서(클러스터가
  // 깜빡이며 재구성되는 게 더 어수선하다) idle 시점 값만 쓴다.
  const [zoom, setZoom] = useState(restoredCamera?.zoom ?? DEFAULT_ZOOM);
  // 클러스터 계산(`clusterPins`)에 넘기는 줌. 네이버 줌은 표준 웹 메르카토르 줌과 축척이
  // 어긋나 있어(QA: 줌 12 의 화면 폭이 표준 줌 13 과 같다) 그대로 넘기면 병합 반경이 화면에서
  // 두 배로 적용된다 — 지도 투영으로 실제 축척을 재서 맞춘다. 벡터/래스터 지도마다 다를 수
  // 있어 상수로 박지 않는다.
  const [clusterZoom, setClusterZoom] = useState(restoredCamera?.clusterZoom ?? DEFAULT_ZOOM);
  const attachMap = useCallback((instance: naver.maps.Map | null) => {
    mapRef.current = instance;
    setMap(instance);
  }, []);

  // 지도가 멈춘 시점의 줌·경계를 위로 올린다. SDK 의 idle 뿐 아니라 선택 장소 이동의 도착
  // 보정(아래)도 부른다 — idle 이 빠지는 경우가 있어서다. 최신 콜백을 쓰도록 ref 로 둔다.
  const reportIdleRef = useRef(() => {});
  reportIdleRef.current = () => {
    const currentMap = mapRef.current;
    if (!currentMap) return;
    const mapCenter = currentMap.getCenter();
    lastCamera = {
      center: { lat: mapCenter.y, lng: mapCenter.x },
      zoom: currentMap.getZoom(),
      clusterZoom: webMercatorZoom(currentMap, navermaps),
    };
    setZoom(lastCamera.zoom);
    setClusterZoom(lastCamera.clusterZoom);
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
  };

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
  const onDestinationBoundsRef = useRef(onDestinationBounds);
  onDestinationBoundsRef.current = onDestinationBounds;
  useEffect(() => {
    if (!map || panTargetLat === undefined || panTargetLng === undefined) return;
    const move = () => {
      // 드로어 위 남은 영역의 `SELECTED_PIN_VISIBLE_AREA_RATIO` 높이에 target 이 오게 한다.
      // 이미 더 확대해 보고 있었다면 그 축척을 존중한다 — 줌 아웃시키지 않는다.
      const targetZoom = Math.max(map.getZoom(), PIN_DETAIL_MIN_ZOOM);
      const destination = centerFor(
        map,
        navermaps,
        new navermaps.LatLng(panTargetLat, panTargetLng),
        targetZoom,
        SELECTED_PIN_VISIBLE_AREA_RATIO,
        sheetSnapRef.current,
      );
      onDestinationBoundsRef.current?.(boundsAt(map, navermaps, destination, targetZoom));
      return animateTo(map, navermaps, destination, targetZoom, () => reportIdleRef.current());
    };
    // 지도가 막 생긴 직후(아카이브 등에서 `?placeId=` 로 들어와 지도와 선택이 같이 뜰 때)엔
    // 초기화가 덜 끝나 이동 명령을 SDK 가 그냥 버린다(QA: 줌·중심이 그대로). 준비되면 그때 옮긴다.
    // `isReady` 는 SDK 런타임 속성인데 타입 선언에 빠져 있다.
    if ((map as naver.maps.Map & { isReady?: boolean }).isReady !== false) return move();
    let cancelMove: (() => void) | undefined;
    const listener = navermaps.Event.once(map, 'init', () => {
      cancelMove = move();
    });
    return () => {
      navermaps.Event.removeListener(listener);
      cancelMove?.();
    };
  }, [map, navermaps, panTargetLat, panTargetLng]);

  // 핀치하면서 손가락을 옮기면 지도도 따라 움직이게 한다 — SDK 는 핀치 시작점을 줌 원점으로
  // 고정하고 이후 중심 이동을 버린다(pinch-pan.ts 참고). 지도 인스턴스가 생길 때 붙이고 바뀌면 뗀다.
  useEffect(() => {
    if (!map) return;
    return attachPinchPan(map, navermaps);
  }, [map, navermaps]);

  // 버블을 누르면 개별 핀이 보이는 줌(`PIN_DETAIL_MIN_ZOOM`)까지 한 번에 당긴다(QA). 멤버가
  // 넓게 퍼져 그 줌에서 화면에 다 안 들어오면, 다 들어오는 가장 큰 줌까지만 당긴다 — 그때
  // 가까운 것끼리는 버블로 남아 한 번 더 누르면 된다. 좌표가 같아(같은 건물) 최대 줌에서도
  // 겹치는 장소는 겹친 핀 그대로 보인다. 선택(시트 열기)은 하지 않는다.
  const zoomIntoCluster = useCallback(
    (members: MapPin[]) => {
      const currentMap = mapRef.current;
      if (!currentMap) return;
      const snap = visibleSheetSnap(sheetSnapRef.current);
      const size = currentMap.getSize();
      const zoom = currentMap.getZoom();
      const projection = currentMap.getProjection();
      const offsets = members.map((pin) =>
        projection.fromCoordToOffset(new navermaps.LatLng(pin.lat, pin.lng)),
      );
      const xs = offsets.map((offset) => offset.x);
      const ys = offsets.map((offset) => offset.y);
      const fitZoom = zoomToFitSpan({
        spanX: Math.max(...xs) - Math.min(...xs),
        spanY: Math.max(...ys) - Math.min(...ys),
        width: size.width - CLUSTER_FIT_PADDING_PX * 2,
        height: size.height * (1 - snap) - CLUSTER_FIT_TOP_INSET_PX - CLUSTER_FIT_PADDING_PX,
        zoom,
      });
      const targetZoom = Math.max(Math.min(fitZoom, PIN_DETAIL_MIN_ZOOM), zoom + 1);
      const lats = members.map((pin) => pin.lat);
      const lngs = members.map((pin) => pin.lng);
      const middle = new navermaps.LatLng(
        (Math.min(...lats) + Math.max(...lats)) / 2,
        (Math.min(...lngs) + Math.max(...lngs)) / 2,
      );
      cancelClusterZoomRef.current?.();
      cancelClusterZoomRef.current = animateTo(
        currentMap,
        navermaps,
        centerFor(currentMap, navermaps, middle, targetZoom, 0.5, sheetSnapRef.current),
        targetZoom,
        () => reportIdleRef.current(),
      );
    },
    [navermaps],
  );
  const cancelClusterZoomRef = useRef<(() => void) | null>(null);
  useEffect(() => () => cancelClusterZoomRef.current?.(), []);

  // 선택된 핀은 클러스터에서 빼고 줌과 무관하게 항상 물방울로 그린다 — 방금 고른 장소가
  // 버블 속에 숨어버리면 안 된다.
  const selectedPin =
    selectedPlaceId === null || selectedPlaceId === undefined
      ? undefined
      : pins.find((pin) => pin.id === selectedPlaceId);
  const restPins = selectedPin ? pins.filter((pin) => pin.id !== selectedPin.id) : pins;
  const renderPin = (pin: MapPin) => (
    <PlacePin
      key={pin.id}
      lat={pin.lat}
      lng={pin.lng}
      name={pin.name}
      color={pin.color}
      thumbnail={pin.thumbnail}
      onClick={() => onPlaceClick?.(pin.id)}
    />
  );

  return (
    <MapDiv style={{ width: '100%', height: '100%' }}>
      <NaverMap
        ref={attachMap}
        defaultCenter={
          new navermaps.LatLng(
            restoredCamera?.center.lat ?? center.lat,
            restoredCamera?.center.lng ?? center.lng,
          )
        }
        defaultZoom={restoredCamera?.zoom ?? DEFAULT_ZOOM}
        {...styleProps}
        onIdle={() => reportIdleRef.current()}
        onClick={(e) => {
          // 오버레이(핀·클러스터 버튼) 위 탭이 지도 click 으로도 올라오면 선택하자마자 풀려
          // 버린다 — 버튼 위에서 시작된 탭은 걸러 낸다.
          if ((e.pointerEvent.target as Element | null)?.closest?.('button')) return;
          onEmptyMapClick?.();
        }}
      >
        {zoom < PIN_DETAIL_MIN_ZOOM
          ? clusterPins(restPins, clusterZoom).map(({ key, lat, lng, pins: members }) =>
              // 묶인 게 하나뿐이면 "1" 버블 대신 개별 핀으로 그린다 — 버블은 실제로 여러 곳이
              // 묶일 때만 쓴다(NOOK-390).
              members.length === 1 && members[0] ? (
                renderPin(members[0])
              ) : (
                <ClusterBubble
                  key={key}
                  lat={lat}
                  lng={lng}
                  count={members.length}
                  onClick={() => zoomIntoCluster(members)}
                />
              ),
            )
          : restPins.map(renderPin)}
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

/** 드로어가 가린 화면 비율. 전체 높이(full)는 가리지 않은 영역이 없어 기본 상세 높이로 본다. */
function visibleSheetSnap(snap: number) {
  return snap < 1 ? snap : DETAIL_PAGE_SNAP_POINT;
}

/**
 * `targetZoom` 으로 옮겼을 때 `coord` 가 드로어 위 남은 영역의 `ratio` 높이(위에서부터)에
 * 보이게 하는 지도 중심. 그냥 coord 를 중심으로 잡으면 화면 정중앙(드로어 경계 부근)에 와서
 * 가려진다. 투영은 현재 줌의 픽셀 좌표계라, 도착 줌에서 필요한 화면 픽셀을 줌 차이만큼
 * 줄여 환산한다(줌 1단계 = 2배).
 */
function centerFor(
  map: naver.maps.Map,
  navermaps: typeof naver.maps,
  coord: naver.maps.LatLng,
  targetZoom: number,
  ratio: number,
  sheetSnap: number,
) {
  const snap = visibleSheetSnap(sheetSnap);
  const height = map.getSize().height;
  const verticalShiftPx =
    (height / 2 - height * (1 - snap) * ratio) * 2 ** (map.getZoom() - targetZoom);
  const projection = map.getProjection();
  const offset = projection.fromCoordToOffset(coord);
  return projection.fromOffsetToCoord(new navermaps.Point(offset.x, offset.y + verticalShiftPx));
}

/** `destination` 을 중심으로 `targetZoom` 까지 옮겼을 때 화면이 덮는 경계. 현재 줌의 투영에서 환산한다. */
function boundsAt(
  map: naver.maps.Map,
  navermaps: typeof naver.maps,
  destination: naver.maps.Coord,
  targetZoom: number,
): MapBounds {
  const size = map.getSize();
  const scale = 2 ** (map.getZoom() - targetZoom);
  const projection = map.getProjection();
  const offset = projection.fromCoordToOffset(destination);
  const halfX = (size.width / 2) * scale;
  const halfY = (size.height / 2) * scale;
  const northWest = projection.fromOffsetToCoord(
    new navermaps.Point(offset.x - halfX, offset.y - halfY),
  );
  const southEast = projection.fromOffsetToCoord(
    new navermaps.Point(offset.x + halfX, offset.y + halfY),
  );
  return { north: northWest.y, west: northWest.x, south: southEast.y, east: southEast.x };
}

/**
 * 목적지로 애니메이션해 옮기고, 끝났어야 할 시점에 도착을 보정한다. 반환값은 취소 함수.
 *
 * SDK 애니메이션은 시간이 다 되면 끝나 버리고 마지막 위치를 적용하지 않는다 — 지도를 막
 * 띄운 직후처럼 프레임이 밀리면 줌 15.8 에서 목적지 못 미쳐 멈추고, 그때 idle 이 안 오기도
 * 한다(QA). 16 미만에서 멈추면 핀 대신 버블이 남고, idle 이 없으면 목적지 핀 목록도 안 온다.
 * 그래서 시간이 지나면 모자란 만큼 목적지에 맞추고, idle 을 기다리지 않고 `onSettled` 로
 * 경계를 직접 보고한다. 그 사이 사용자가 지도를 잡으면 보정하지 않는다 — 손을 이기면 안 된다.
 */
function animateTo(
  map: naver.maps.Map,
  navermaps: typeof naver.maps,
  destination: naver.maps.Coord,
  targetZoom: number,
  onSettled: () => void,
) {
  const transition = { duration: SELECTED_PLACE_MOVE_DURATION_MS };
  if (Math.abs(map.getZoom() - targetZoom) < 0.001) map.panTo(destination, transition);
  else map.morph(destination, targetZoom, transition);

  const projection = map.getProjection();
  const settle = setTimeout(() => {
    const arrived = projection.fromCoordToOffset(map.getCenter());
    const expected = projection.fromCoordToOffset(destination);
    const off =
      Math.abs(map.getZoom() - targetZoom) > 0.001 ||
      Math.hypot(arrived.x - expected.x, arrived.y - expected.y) > 1;
    if (off) {
      map.setZoom(targetZoom, false);
      map.setCenter(destination);
    }
    onSettled();
  }, SELECTED_PLACE_MOVE_DURATION_MS + MOVE_SETTLE_GRACE_MS);
  const userGrabs = ['dragstart', 'pinchstart'].map((event) =>
    navermaps.Event.once(map, event, () => clearTimeout(settle)),
  );
  return () => {
    clearTimeout(settle);
    navermaps.Event.removeListener(userGrabs);
  };
}

/**
 * 지금 화면 축척에 해당하는 표준 웹 메르카토르 줌(`pin-cluster` 의 월드 픽셀 기준).
 * 적도에서 경도 1도가 화면에서 몇 px 인지 재서 거꾸로 푼다 — 표준 줌 0 에선 256/360 px 이다.
 */
function webMercatorZoom(map: naver.maps.Map, navermaps: typeof naver.maps) {
  const projection = map.getProjection();
  const origin = projection.fromCoordToOffset(new navermaps.LatLng(0, 0));
  const oneDegreeEast = projection.fromCoordToOffset(new navermaps.LatLng(0, 1));
  return Math.log2((oneDegreeEast.x - origin.x) / (256 / 360));
}
