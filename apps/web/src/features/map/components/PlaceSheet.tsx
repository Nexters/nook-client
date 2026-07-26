import emptySavedPlacesIllustration from '@/assets/illustrations/empty-saved-places.svg';
import { PlaceDetail } from '@/features/map/components/PlaceDetail';
import { FULL_SNAP_POINT, SNAP_POINTS } from '@/features/map/constants';
import type { MockPlace } from '@/features/map/mock/places';
import { useAppShellContainer } from '@/shared/lib/app-shell-container';
import { Drawer, DrawerContent } from '@/shared/ui';

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
    <div className="flex flex-1 flex-col items-center justify-center gap-5">
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
      <DrawerContent overlay={false} className="max-h-[100dvh] overflow-hidden">
        {/*
          vaul 은 스냅 포인트 간 이동 거리를 "실제 렌더링된 콘텐츠 높이" 기준으로 계산한다.
          콘텐츠가 짧으면(카드 그리드만 있을 때) 그 높이가 mid(0.76) 정도밖에 안 돼서
          peek(0.23)로 내리려는 이동량이 콘텐츠 높이를 넘어서 시트 전체가 화면 밖으로
          밀려난다. h-dvh 로 항상 한 화면 높이를 채워 세 스냅 포인트가 성립하게 하되,
          장소 상세처럼 실제 콘텐츠가 한 화면보다 길어지는 경우엔 min-height 가 아니라
          고정 height 라 이 div 안에서만(overflow-y-auto) 스크롤되고 화면 밖으로는
          넘치지 않는다. 바깥 DrawerContent 의 overflow-hidden 은 그 경계 밖으로
          비어져 나오는 걸(그래서 body 전체가 스크롤되는 것) 막는 안전장치다.
        */}
        <div className="flex h-dvh flex-col gap-3 overflow-y-auto px-4 pb-5">
          {selectedPlace ? (
            <PlaceDetail place={selectedPlace} expanded={snap === FULL_SNAP_POINT} />
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
