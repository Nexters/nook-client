import { MapView } from '@/features/map/components/MapView';
import { useCurrentLocation } from '@/features/map/hooks/useCurrentLocation';
import { MOCK_PLACES } from '@/features/map/mock/places';

export function MapPage() {
  const location = useCurrentLocation();

  if (location.status === 'loading') {
    return (
      <div className="flex h-dvh w-full items-center justify-center">
        <p className="text-b2 text-gray-60">위치 확인 중…</p>
      </div>
    );
  }

  return (
    <div className="h-dvh w-full">
      <MapView
        places={MOCK_PLACES}
        currentLocation={location.coords}
        initialCenter={location.coords ?? undefined}
      />
    </div>
  );
}
