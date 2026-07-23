import { useState } from 'react';
import type { MockPlace } from '@/features/map/mock/places';
import { useAppShellContainer } from '@/shared/lib/app-shell-container';
import { Drawer, DrawerContent } from '@/shared/ui';

/**
 * Figma 시안 기준 3단계 스냅(뷰포트 대비 노출 비율).
 * peek: 핸들+타이틀만 살짝(≈185/812) · mid: 카드 그리드 전체(≈617/812) · full: 전체화면
 */
const PEEK_SNAP_POINT = 0.23;
const SNAP_POINTS = [PEEK_SNAP_POINT, 0.76, 1];

function PlaceCard({ place }: { place: MockPlace }) {
  return (
    <div className="flex w-[167.5px] shrink-0 flex-col gap-1 pb-2">
      {/* 실제 업체 사진 API 연동 전까지 회색 박스로 대체 */}
      <div className="h-[170px] w-full rounded-sm border border-gray-20 bg-gray-10" />
      <div className="flex flex-col gap-0.5 p-1">
        <p className="text-b2 font-semibold text-gray-90">{place.name}</p>
        <p className="flex gap-0.5 text-b3 font-medium text-gray-60">
          <span>서울</span>
          <span>•</span>
          <span>카페</span>
        </p>
      </div>
    </div>
  );
}

export function PlaceSheet({ places }: { places: MockPlace[] }) {
  const [snap, setSnap] = useState<number | string | null>(PEEK_SNAP_POINT);
  const shellContainer = useAppShellContainer();

  return (
    <Drawer
      open
      dismissible={false}
      modal={false}
      snapPoints={SNAP_POINTS}
      activeSnapPoint={snap}
      setActiveSnapPoint={setSnap}
      container={shellContainer}
    >
      <DrawerContent overlay={false} className="max-h-[100dvh]">
        {/*
          vaul 은 스냅 포인트 간 이동 거리를 "실제 렌더링된 콘텐츠 높이" 기준으로 계산한다.
          지금 콘텐츠(카드 그리드)만 있으면 mid(0.76) 높이 정도밖에 안 돼서 peek(0.23)로
          내리려는 이동량이 콘텐츠 높이를 넘어서 시트 전체가 화면 밖으로 밀려난다.
          전체화면(full) 상태의 실제 콘텐츠(장소 상세)가 생기기 전까지는 min-h-dvh 로
          바닥을 채워 세 스냅 포인트가 항상 성립하게 한다.
        */}
        <div className="flex min-h-dvh flex-col gap-3 overflow-y-auto px-4 pb-5">
          <p className="text-b1 font-medium text-gray-90">최근 저장한 공간</p>
          <div className="grid grid-cols-2 gap-2 justify-items-center">
            {places.map((place) => (
              <PlaceCard key={place.id} place={place} />
            ))}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
