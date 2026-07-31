import { useEffect, useRef, useState } from 'react';
import { useBottomMenuVisibility } from '@/app/bottom-menu-visibility';
import { useAppShellContainer } from '@/app/providers';
import emptySavedPlacesIllustration from '@/assets/illustrations/empty-saved-places.svg';
import { PlaceDetail } from '@/features/map/components/PlaceDetail';
import { getPlaceSheetLayoutClassNames } from '@/features/map/components/place-sheet-layout';
import {
  BROWSE_SNAP_POINTS,
  DETAIL_SNAP_POINTS,
  FULL_SNAP_POINT,
  MID_SNAP_POINT,
} from '@/features/map/constants';
import type { PlaceDetail as PlaceDetailModel, RecentPlace } from '@/features/map/types';
import { PlaceCard } from '@/features/place';
import { cn } from '@/shared/lib/utils';
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
  recentPlaces,
  selectedPlace,
  isPlaceDetailPending,
  isPlaceDetailError,
  snap,
  onSnapChange,
  onSelectPlace,
}: {
  recentPlaces: RecentPlace[];
  selectedPlace: PlaceDetailModel | null;
  /** true 인 동안은 상세를 아직 못 받았지만(선택은 됐지만) 상세 레이아웃으로는 이미 전환해야 한다. */
  isPlaceDetailPending: boolean;
  isPlaceDetailError: boolean;
  snap: number | string | null;
  onSnapChange: (snap: number | string | null) => void;
  onSelectPlace: (id: number) => void;
}) {
  const shellContainer = useAppShellContainer();
  // BottomMenu 를 숨기는 조건은 MapPage(선택된 장소 유무)가 정하고, 여기선 그 결과값만
  // 그대로 읽는다 — 나중에 숨기는 이유가 늘어나도 이 시트 레이아웃은 자동으로 따라간다.
  const { hidden: bottomMenuHidden } = useBottomMenuVisibility();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const isFull = snap === FULL_SNAP_POINT;
  const hasSelection = selectedPlace !== null || isPlaceDetailPending || isPlaceDetailError;
  // 내부 스크롤은 목록이 충분히 펼쳐진 스냅에서만 허용한다(탐색: mid 이상=Figma
  // 94:4075·94:4165, 상세: full). 그 아래 스냅에서는 시트 안 어디를 잡아도 드래그가
  // 드로어 이동으로만 동작해야 하므로(제스처 주인은 상태마다 하나) overflow 를 잠근다.
  const canScroll = hasSelection ? isFull : snap === MID_SNAP_POINT || isFull;
  const layoutClassNames = getPlaceSheetLayoutClassNames(bottomMenuHidden, snap);

  // 스크롤이 "불가 → 가능"으로 바뀌는 순간과 보는 장소가 바뀔 때만 맨 위로 되돌린다.
  // isFull 이 아니라 canScroll 을 트리거로 쓰는 이유: 탐색 모드 mid ↔ full 은 둘 다
  // 스크롤 가능한 스냅이라, 그 사이를 오갈 때 보던 위치를 잃지 않아야 한다.
  // biome-ignore lint/correctness/useExhaustiveDependencies: canScroll/selectedPlace.id 는 본문에서 값을 쓰지 않는 트리거 전용 의존성
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    setIsScrolled(false);
  }, [canScroll, selectedPlace?.id]);

  return (
    <Drawer
      open
      dismissible={false}
      modal={false}
      snapPoints={hasSelection ? DETAIL_SNAP_POINTS : BROWSE_SNAP_POINTS}
      activeSnapPoint={snap}
      setActiveSnapPoint={onSnapChange}
      container={shellContainer}
    >
      <DrawerContent
        overlay={false}
        showHandle={!isFull || !isScrolled}
        style={layoutClassNames.drawer.style}
        className={cn('overflow-hidden', layoutClassNames.drawer.className)}
      >
        <div
          ref={scrollRef}
          onScroll={(e) => {
            if (!isFull) return;
            setIsScrolled(e.currentTarget.scrollTop > SCROLL_HIDE_HANDLE_THRESHOLD);
          }}
          style={layoutClassNames.scroller.style}
          className={cn(
            'flex flex-col gap-3 px-4',
            canScroll ? 'overflow-y-auto' : 'overflow-hidden',
            layoutClassNames.scroller.className,
          )}
        >
          {hasSelection ? (
            isPlaceDetailError ? (
              <p className="pt-10 text-center text-b2 text-gray-60">장소를 불러오지 못했어요</p>
            ) : selectedPlace ? (
              <PlaceDetail
                key={selectedPlace.id}
                place={selectedPlace}
                expanded={isFull}
                onSelectPlace={onSelectPlace}
              />
            ) : // isPlaceDetailPending — 아직 상세 응답 전이라 아무것도 그리지 않는다
            // (GroupPage 와 같은 정책: 로딩 문구가 잠깐 스쳐 지나가지 않게 한다).
            null
          ) : (
            <>
              <p className="text-b1 font-medium text-gray-90">최근 저장한 공간</p>
              {recentPlaces.length === 0 ? (
                <EmptySavedPlaces />
              ) : (
                <div className="grid grid-cols-2 justify-items-center gap-2">
                  {recentPlaces.map((place) => (
                    <PlaceCard
                      key={place.id}
                      place={{
                        id: String(place.id),
                        name: place.name,
                        category: place.category ?? '',
                        thumbnail: place.thumbnail,
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
