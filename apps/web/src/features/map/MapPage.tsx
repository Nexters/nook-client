import { useMemo, useRef, useState } from 'react';
import { MapView, type MapViewHandle } from '@/features/map/components/MapView';
import { PlaceSheet } from '@/features/map/components/PlaceSheet';
import { RecenterButton } from '@/features/map/components/RecenterButton';
import { MID_SNAP_POINT, PEEK_SNAP_POINT } from '@/features/map/constants';
import { useCurrentLocation } from '@/features/map/hooks/useCurrentLocation';
import { shouldClearSelectionOnSnapChange } from '@/features/map/lib/drawer-selection';
import { getMockPlaces } from '@/features/map/mock/places';

const FALLBACK_CENTER = { lat: 37.5729, lng: 126.9762 }; // 위치 못 가져왔을 때 광화문 인근 폴백

export function MapPage() {
  const location = useCurrentLocation();
  const mapRef = useRef<MapViewHandle>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [snap, setSnap] = useState<number | string | null>(PEEK_SNAP_POINT);

  // location.coords 는 최초 1회 조회 후 바뀌지 않으므로 loading 이 끝난 뒤에만 계산한다.
  const places = useMemo(
    () =>
      getMockPlaces(
        location.status === 'resolved' ? (location.coords ?? FALLBACK_CENTER) : FALLBACK_CENTER,
      ),
    [location],
  );

  if (location.status === 'loading') {
    return (
      <div className="flex h-dvh w-full items-center justify-center">
        <p className="text-b2 text-gray-60">위치 확인 중…</p>
      </div>
    );
  }

  const selectedPlace = places.find((place) => place.id === selectedPlaceId) ?? null;

  function handlePlaceClick(id: string) {
    setSelectedPlaceId(id);
    setSnap(MID_SNAP_POINT);
  }

  function handleSnapChange(next: number | string | null) {
    setSnap(next);
    if (shouldClearSelectionOnSnapChange(next)) {
      setSelectedPlaceId(null);
    }
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <MapView
        ref={mapRef}
        places={places}
        currentLocation={location.coords}
        initialCenter={location.coords ?? undefined}
        selectedPlaceId={selectedPlaceId}
        onPlaceClick={handlePlaceClick}
      />
      {snap === PEEK_SNAP_POINT && <RecenterButton onClick={() => mapRef.current?.recenter()} />}
      <PlaceSheet
        places={places}
        selectedPlace={selectedPlace}
        snap={snap}
        onSnapChange={handleSnapChange}
      />
    </div>
  );
}
