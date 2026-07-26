import { useEffect, useRef, useState } from 'react';
import emptySavedPlacesIllustration from '@/assets/illustrations/empty-saved-places.svg';
import { PlaceDetail } from '@/features/map/components/PlaceDetail';
import { BROWSE_SNAP_POINTS, DETAIL_SNAP_POINTS, FULL_SNAP_POINT } from '@/features/map/constants';
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

  // full 이 아닌 스냅으로 내려가거나, full 상태에서 연관 장소를 눌러 다른 장소로
  // 바뀌면 이전 스크롤 위치가 새 콘텐츠에 그대로 남아 핸들이 잘못된 상태로 시작할 수
  // 있으니 맨 위로 되돌린다.
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
            <PlaceDetail
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
