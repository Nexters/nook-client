import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBottomMenuVisibility } from '@/app/bottom-menu-visibility';
import { MainTabPageLayout } from '@/app/layouts/MainTabPageLayout';
import { MapView, type MapViewHandle } from '@/features/map/components/MapView';
import { PlaceSheet } from '@/features/map/components/PlaceSheet';
import { RecenterButton } from '@/features/map/components/RecenterButton';
import { DETAIL_PAGE_SNAP_POINT, PEEK_SNAP_POINT } from '@/features/map/constants';
import { useCurrentLocation } from '@/features/map/hooks/useCurrentLocation';
import type { MapBounds } from '@/features/map/types';
import type { Coordinates } from '@/shared/lib/geolocation';
import { useMapPins, usePlaceDetail, useRecentPlaces } from './api/queries';

const FALLBACK_CENTER = { lat: 37.5729, lng: 126.9762 }; // 위치 못 가져왔을 때 광화문 인근 폴백
// 실제 뷰포트보다 넉넉한 값 — 지도가 처음 idle에 도달하면 실제 경계로 바로 교체된다.
const INITIAL_BOUNDS_DELTA = 0.01;

function toInitialBounds(center: Coordinates): MapBounds {
  return {
    north: center.lat + INITIAL_BOUNDS_DELTA,
    south: center.lat - INITIAL_BOUNDS_DELTA,
    east: center.lng + INITIAL_BOUNDS_DELTA,
    west: center.lng - INITIAL_BOUNDS_DELTA,
  };
}

/** `/map?placeId=123` 형태의 딥링크(연관 장소 클릭 등)로 들어왔을 때만 값을 준다. */
function parsePlaceIdParam(raw: string | null): number | null {
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function MapPage() {
  const location = useCurrentLocation();
  const { setHidden: setBottomMenuHidden } = useBottomMenuVisibility();
  const mapRef = useRef<MapViewHandle>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  // 다른 화면(연관 장소 클릭 등)에서 `/map?placeId=123` 으로 들어오면 핀을 직접 클릭한
  // 것과 같은 상태(선택됨 + detailPage 스냅)로 최초 렌더에 반영한다.
  const initialPlaceId = parsePlaceIdParam(searchParams.get('placeId'));
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(initialPlaceId);
  const [snap, setSnap] = useState<number | string | null>(
    initialPlaceId !== null ? DETAIL_PAGE_SNAP_POINT : PEEK_SNAP_POINT,
  );
  // 지도의 실제 idle 이벤트로 받은 경계. 아직 한 번도 못 받았으면(최초 마운트 직후,
  // 혹은 최초 idle이 지도 생성과 한 프레임 차이로 마운트와 경합해 유실됐을 경우 포함)
  // null로 남아 있고, 그동안은 아래 `effectiveBounds`가 현재 위치 기준 근사값으로 대신한다
  // — 그래서 실제 idle을 영영 못 받아도 핀 조회 자체가 멈추지 않는다.
  const [bounds, setBounds] = useState<MapBounds | null>(null);

  const fallbackCenter =
    location.status === 'resolved' ? (location.coords ?? FALLBACK_CENTER) : FALLBACK_CENTER;
  const effectiveBounds = bounds ?? toInitialBounds(fallbackCenter);

  const pinsQuery = useMapPins(effectiveBounds);
  const recentPlacesQuery = useRecentPlaces();
  const placeDetailQuery = usePlaceDetail(selectedPlaceId);

  // 선택된 장소의 핀은 bbox 조회를 기다리지 않고 상세 응답으로 바로 그린다.
  // bbox 조회(/places/map)는 (1) 초기엔 현재 위치 기준이라 멀리 있는 선택 장소가
  // 빠져 있고, (2) 팬이 끝나 idle 이 발화해야 재조회되며, (3) 애초에 북마크된
  // 장소만 내려줘서 북마크 안 된 연관 장소는 영영 안 내려온다 — 선택돼 있는 동안은
  // 상세 응답의 좌표로 핀을 보장한다. 지도 이동(panTarget)과 같은 데이터 소스라
  // 핀과 이동이 항상 같이 일어난다.
  const bboxPins = pinsQuery.data ?? [];
  const selectedPlace = selectedPlaceId !== null ? (placeDetailQuery.data ?? null) : null;
  const pins =
    selectedPlace && !bboxPins.some((pin) => pin.id === selectedPlace.id)
      ? [...bboxPins, { id: selectedPlace.id, lat: selectedPlace.lat, lng: selectedPlace.lng }]
      : bboxPins;

  useEffect(() => {
    setBottomMenuHidden(selectedPlaceId !== null);
    return () => setBottomMenuHidden(false);
  }, [selectedPlaceId, setBottomMenuHidden]);

  // 딥링크로 들어온 placeId 는 최초 상태에 한 번만 반영하고 주소는 정리한다 — 남겨두면
  // 이 장소를 선택 해제한 뒤 새로고침/뒤로가기 시 같은 장소가 다시 강제 선택된다.
  // biome-ignore lint/correctness/useExhaustiveDependencies: 마운트 시 한 번만 정리한다
  useEffect(() => {
    if (initialPlaceId !== null) setSearchParams({}, { replace: true });
  }, []);

  if (location.status === 'loading') {
    return (
      <div className="flex h-dvh w-full items-center justify-center">
        <p className="text-b2 text-gray-60">위치 확인 중…</p>
      </div>
    );
  }

  function handlePlaceClick(id: number) {
    setSelectedPlaceId(id);
    setSnap(DETAIL_PAGE_SNAP_POINT); // detailPage 스냅으로 열어 상세를 보여준다
  }

  function handleSnapChange(next: number | string | null) {
    setSnap(next);
    // peek(최소 높이)까지 내려가면 상세를 접고 기본 목록으로 되돌린다.
    if (next === PEEK_SNAP_POINT) {
      setSelectedPlaceId(null);
    }
  }

  return (
    <MainTabPageLayout variant="transparent">
      <div className="relative h-full w-full overflow-hidden">
        <MapView
          ref={mapRef}
          pins={pins}
          currentLocation={location.coords}
          initialCenter={location.coords ?? undefined}
          selectedPlaceId={selectedPlaceId}
          // 선택 장소로의 이동은 명령이 아니라 선언 — 상세 응답의 좌표를 그대로 내려주면
          // 지도가 늦게 마운트되든(스크립트 Suspense) 상세가 늦게 오든 MapView 가 알아서
          // 준비되는 시점에 이동한다. 선택이 풀리면 undefined 가 되어 이동하지 않는다.
          panTarget={selectedPlace ? { lat: selectedPlace.lat, lng: selectedPlace.lng } : undefined}
          onPlaceClick={handlePlaceClick}
          onBoundsChanged={setBounds}
        />
        {snap === PEEK_SNAP_POINT && <RecenterButton onClick={() => mapRef.current?.recenter()} />}
        <PlaceSheet
          recentPlaces={recentPlacesQuery.data ?? []}
          selectedPlace={placeDetailQuery.data ?? null}
          isPlaceDetailPending={selectedPlaceId !== null && placeDetailQuery.isPending}
          isPlaceDetailError={selectedPlaceId !== null && placeDetailQuery.isError}
          snap={snap}
          onSnapChange={handleSnapChange}
          onSelectPlace={handlePlaceClick}
        />
      </div>
    </MainTabPageLayout>
  );
}
