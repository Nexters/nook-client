import { useEffect, useRef, useState } from 'react';
import { useAppShellContainer } from '@/app/providers';
import emptySavedPlacesIllustration from '@/assets/illustrations/empty-saved-places.svg';
import { PlaceDetail } from '@/features/map/components/PlaceDetail';
import { BROWSE_SNAP_POINTS, DETAIL_SNAP_POINTS, FULL_SNAP_POINT } from '@/features/map/constants';
import type { MockPlace } from '@/features/map/mock/places';
import { PlaceCard } from '@/features/place';
import { Drawer, DrawerContent } from '@/shared/ui';

/** 이 값을 넘겨 스크롤된 것으로 판단한다(0 근처의 미세한 바운스/오차 무시). */
const SCROLL_HIDE_HANDLE_THRESHOLD = 4;

function EmptySavedPlaces() {
  return (
    <div className="flex flex-1 flex-col items-center mt-[60px] gap-5">
      <img src={emptySavedPlacesIllustration} alt="" className="size-[200px]" />
      <p className="text-b1 font-medium text-gray-70">아직 저장한 공간이 없어요</p>
    </div>
  );
}

export function PlaceSheet({
  places,
  selectedPlace,
  snap,
  onSnapChange,
  onSelectPlace,
}: {
  places: MockPlace[];
  selectedPlace: MockPlace | null;
  snap: number | string | null;
  onSnapChange: (snap: number | string | null) => void;
  onSelectPlace: (id: string) => void;
}) {
  const shellContainer = useAppShellContainer();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const isFull = snap === FULL_SNAP_POINT;

  // biome-ignore lint/correctness/useExhaustiveDependencies: isFull/selectedPlace.id 는 본문에서 값을 쓰지 않는 트리거 전용 의존성
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    setIsScrolled(false);
  }, [isFull, selectedPlace?.id]);

  return (
    <Drawer
      open
      dismissible={false}
      modal={false}
      snapPoints={selectedPlace ? DETAIL_SNAP_POINTS : BROWSE_SNAP_POINTS}
      activeSnapPoint={snap}
      setActiveSnapPoint={onSnapChange}
      container={shellContainer}
    >
      <DrawerContent
        overlay={false}
        showHandle={!isFull || !isScrolled}
        className="bottom-[calc(60px+env(safe-area-inset-bottom))] max-h-[calc(100dvh-60px-env(safe-area-inset-bottom))] overflow-hidden"
      >
        <div
          ref={scrollRef}
          onScroll={(e) => {
            if (!isFull) return;
            setIsScrolled(e.currentTarget.scrollTop > SCROLL_HIDE_HANDLE_THRESHOLD);
          }}
          className="flex h-[calc(100dvh-60px-env(safe-area-inset-bottom))] flex-col gap-3 overflow-y-auto px-4 pb-5"
        >
          {selectedPlace ? (
            <PlaceDetail
              key={selectedPlace.id}
              place={selectedPlace}
              places={places}
              expanded={isFull}
              onSelectPlace={onSelectPlace}
            />
          ) : (
            <>
              <p className="text-b1 font-medium text-gray-90">최근 저장한 공간</p>
              {places.length === 0 ? (
                <EmptySavedPlaces />
              ) : (
                <div className="grid grid-cols-2 justify-items-center gap-2">
                  {places.map((place) => (
                    <PlaceCard
                      key={place.id}
                      place={{
                        id: place.id,
                        name: place.name,
                        category: place.category,
                        region: place.region,
                      }}
                      onClick={() => onSelectPlace(place.id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
