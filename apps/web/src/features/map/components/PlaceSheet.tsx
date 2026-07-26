import { useEffect, useRef, useState } from 'react';
import emptySavedPlacesIllustration from '@/assets/illustrations/empty-saved-places.svg';
import { PlaceDetail } from '@/features/map/components/PlaceDetail';
import { FULL_SNAP_POINT, SNAP_POINTS } from '@/features/map/constants';
import type { MockPlace } from '@/features/map/mock/places';
import { useAppShellContainer } from '@/shared/lib/app-shell-container';
import { Drawer, DrawerContent } from '@/shared/ui';

/** 이 값을 넘겨 스크롤된 것으로 판단한다(0 근처의 미세한 바운스/오차 무시). */
const SCROLL_HIDE_HANDLE_THRESHOLD = 4;

function PlaceCard({ place }: { place: MockPlace }) {
  return (
    <div className="flex w-[167.5px] shrink-0 flex-col gap-1 pb-2">
      {/* 실제 업체 사진 API 연동 전까지 회색 박스로 대체 */}
      <div className="h-[170px] w-full rounded-sm border border-gray-20 bg-gray-10" />
      <div className="flex flex-col gap-0.5 p-1">
        <p className="text-b2 font-semibold text-gray-90">{place.name}</p>
        <p className="flex gap-0.5 text-b3 font-medium text-gray-60">
          <span>{place.region}</span>
          <span>•</span>
          <span>{place.category}</span>
        </p>
      </div>
    </div>
  );
}

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
}: {
  places: MockPlace[];
  selectedPlace: MockPlace | null;
  snap: number | string | null;
  onSnapChange: (snap: number | string | null) => void;
}) {
  const shellContainer = useAppShellContainer();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const isFull = snap === FULL_SNAP_POINT;

  // full 이 아닌 스냅으로 내려가거나 다른 장소를 선택하면, 다음에 full 로 열었을 때
  // 이전 스크롤 위치 때문에 핸들이 잘못된 상태로 시작하지 않도록 맨 위로 되돌린다.
  useEffect(() => {
    if (!isFull) {
      scrollRef.current?.scrollTo({ top: 0 });
      setIsScrolled(false);
    }
  }, [isFull]);

  return (
    <Drawer
      open
      dismissible={false}
      modal={false}
      snapPoints={SNAP_POINTS}
      activeSnapPoint={snap}
      setActiveSnapPoint={onSnapChange}
      container={shellContainer}
    >
      <DrawerContent
        overlay={false}
        showHandle={!isFull || !isScrolled}
        className="max-h-[100dvh] overflow-hidden"
      >
        <div
          ref={scrollRef}
          onScroll={(e) => {
            if (!isFull) return;
            setIsScrolled(e.currentTarget.scrollTop > SCROLL_HIDE_HANDLE_THRESHOLD);
          }}
          className="flex h-dvh flex-col gap-3 overflow-y-auto px-4 pb-5"
        >
          {selectedPlace ? (
            <PlaceDetail place={selectedPlace} expanded={isFull} />
          ) : (
            <>
              <p className="text-b1 font-medium text-gray-90">최근 저장한 공간</p>
              {places.length === 0 ? (
                <EmptySavedPlaces />
              ) : (
                <div className="grid grid-cols-2 justify-items-center gap-2">
                  {places.map((place) => (
                    <PlaceCard key={place.id} place={place} />
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
