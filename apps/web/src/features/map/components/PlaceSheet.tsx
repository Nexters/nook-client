import { useEffect, useRef, useState } from 'react';
import { useBottomMenuVisibility } from '@/app/bottom-menu-visibility';
import { useAppShellContainer } from '@/app/providers';
import { useSlideScreen } from '@/app/slide-screen';
import { EmptySavedPlaces } from '@/features/map/components/EmptySavedPlaces';
import { PlaceActions } from '@/features/map/components/PlaceActions';
import { PlaceDetail } from '@/features/map/components/PlaceDetail';
import { PlaceSearchPanel } from '@/features/map/components/PlaceSearchPanel';
import { getPlaceSheetLayoutClassNames } from '@/features/map/components/place-sheet-layout';
import { BROWSE_SNAP_POINTS, DETAIL_SNAP_POINTS, FULL_SNAP_POINT } from '@/features/map/constants';
import type { PlaceDetail as PlaceDetailModel, RecentPlace } from '@/features/map/types';
import { PlaceCard } from '@/features/place';
import { Icon16ArrowDown, Icon24Back, Icon24MagnifyingGlass } from '@/shared/icons/NookIcons';
import type { Coordinates } from '@/shared/lib/geolocation';
import { cn } from '@/shared/lib/utils';
import { Drawer, DrawerContent, FloatingButton, Header } from '@/shared/ui';

/** 이 값을 넘겨 스크롤된 것으로 판단한다(0 근처의 미세한 바운스/오차 무시). */
const SCROLL_HIDE_HANDLE_THRESHOLD = 4;

export function PlaceSheet({
  recentPlaces,
  selectedPlace,
  shareToken,
  isPlaceDetailPending,
  isPlaceDetailError,
  snap,
  instantOpen = false,
  userCoords,
  isSearchMode,
  onSnapChange,
  onSelectPlace,
  onClose,
  onEnterSearch,
  onExitSearch,
  onSearchInputFocus,
}: {
  recentPlaces: RecentPlace[];
  selectedPlace: PlaceDetailModel | null;
  /**
   * 공유 아카이브 딥링크로 들어온 경우의 토큰 — 있으면 상세를 공유자 기준 읽기 전용으로
   * 그린다(공개 API 조회, 저장 토글·메모 편집 등 숨김). `PlaceDetail` 로 그대로 내려간다.
   */
  shareToken?: string | null;
  /** true 인 동안은 상세를 아직 못 받았지만(선택은 됐지만) 상세 레이아웃으로는 이미 전환해야 한다. */
  isPlaceDetailPending: boolean;
  isPlaceDetailError: boolean;
  snap: number | string | null;
  /** true 면 마운트 시 아래에서 올라오는 오프닝 모션 없이 현재 스냅 높이에 즉시 둔다(뒤로가기 복원용). */
  instantOpen?: boolean;
  /** 현재 위치 — 장소까지의 거리 표기에 쓴다. 없으면 거리를 보여주지 않는다. */
  userCoords?: Coordinates | null;
  /** 저장한 공간 검색 모드 — 탐색 콘텐츠 위로 검색 패널이 슬라이드되어 덮는다. */
  isSearchMode: boolean;
  onSnapChange: (snap: number | string | null) => void;
  onSelectPlace: (id: number) => void;
  onClose: () => void;
  onEnterSearch: () => void;
  onExitSearch: () => void;
  /** 검색 입력이 포커스될 때 — 낮은 스냅이면 결과가 보이는 높이로 올리는 용도(MapPage). */
  onSearchInputFocus: () => void;
}) {
  const shellContainer = useAppShellContainer();
  // BottomMenu 를 숨기는 조건은 MapPage(선택된 장소 유무)가 정하고, 여기선 그 결과값만
  // 그대로 읽는다 — 나중에 숨기는 이유가 늘어나도 이 시트 레이아웃은 자동으로 따라간다.
  const { hidden: bottomMenuHidden } = useBottomMenuVisibility();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const isFull = snap === FULL_SNAP_POINT;
  const hasSelection = selectedPlace !== null || isPlaceDetailPending || isPlaceDetailError;
  // 내부 스크롤은 full 스냅에서만 허용한다. 그 아래 스냅(mid 포함)에서는 시트 안 어디를
  // 잡아도 드래그가 드로어 이동으로만 동작해야 하므로(제스처 주인은 상태마다 하나)
  // overflow 를 잠근다 — mid 에서 아래로 끌면 vaul 이 자동으로 드래그로 라우팅해 full 로
  // 펼쳐진다(QA).
  const canScroll = isFull;
  // 스크롤을 내리면 드래그핸들 대신 고정 헤더가 뜬다(Figma `스크롤시 헤더 변경`).
  // 맨 위로 되돌아오면 다시 핸들로 바뀐다.
  const showStickyHeader = isFull && isScrolled && selectedPlace !== null;
  const layoutClassNames = getPlaceSheetLayoutClassNames(bottomMenuHidden, snap, showStickyHeader);
  // 검색 패널의 오른쪽→왼쪽 슬라이드 — 전체화면 전환(slide-screen)과 같은 전환/뒤로가기
  // 계약을 그대로 쓴다(Android 하드웨어 백도 검색 닫기로 수렴). 패널이 탐색 콘텐츠 위를
  // 덮는 오버레이라, 닫힘은 슬라이드가 끝난 뒤(onExitSearch)에 실제로 일어난다.
  const { slidIn: searchSlidIn, slideOut: slideOutSearch } = useSlideScreen({
    open: isSearchMode,
    close: onExitSearch,
  });
  // 스크롤 영역과 검색 오버레이가 같은 높이를 공유해야 해서, 높이만 래퍼로 올린다.
  const { height: contentHeight, ...scrollerStyle } = layoutClassNames.scroller.style ?? {};

  // instantOpen: 마운트 직후 잠깐 transform transition 을 꺼서 vaul 의 오프닝 모션(화면
  // 아래 100% → 스냅 위치로 transition)을 생략한다. vaul 이 스냅 배치를 inline style 로
  // 덮어쓰므로 !important(transition-none!)가 필요하고, 첫 배치가 끝날 만큼(vaul 의
  // transition 시간 500ms)만 끈 뒤 되돌린다 — 이후 드래그/스냅 애니메이션은 정상이다.
  const [suppressTransition, setSuppressTransition] = useState(instantOpen);
  useEffect(() => {
    if (!suppressTransition) return;
    const timer = setTimeout(() => setSuppressTransition(false), 500);
    return () => clearTimeout(timer);
  }, [suppressTransition]);

  // full 진입(스크롤 불가 → 가능)과 보는 장소가 바뀔 때만 맨 위로 되돌린다.
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
        style={{
          ...layoutClassNames.drawer.style,
          // iOS 는 키보드가 떠도 시트(fixed)를 밀어 올려주지 않고 Safari 가 페이지를 살짝
          // 팬하기만 한다 — 그만큼 시트 바닥이 키보드 위로 밀리며 그 틈으로 뒤의 지도가
          // 드러난다. 시트와 같은 색 사각형(blur/spread 없는 그림자)을 아래로 한 화면
          // 길이만큼 깔아, 팬으로 드러나는 영역이 지도 대신 시트 배경으로 보이게 한다.
          // 평소엔 화면(레이아웃 뷰포트) 밖이라 아무것도 그리지 않는 것과 같다.
          // Tailwind 임의값(shadow-[...])은 이 값을 생성하지 못해 inline style 로 둔다.
          //
          // 에뮬레이터에서도 키보드/주소창 영역은 반투명이라 회색으로 비쳐 보인다(iOS 자체
          // 재질) — 실기기 배포본에서 지도가 실제로 비치는지 별도로 확인 필요.
          boxShadow: '0 100dvh 0 0 var(--color-gray-0)',
        }}
        className={cn(
          'overflow-hidden',
          suppressTransition && 'transition-none!',
          layoutClassNames.drawer.className,
        )}
      >
        {showStickyHeader && selectedPlace ? (
          <Header
            size="bottom"
            // 시안은 뒤로가기 바로 옆에 제목이 붙는 좌측 정렬이라 기본 justify-between 을 덮는다.
            className="shrink-0 justify-start gap-2"
            left={
              <button type="button" onClick={onClose} aria-label="뒤로">
                <Icon24Back />
              </button>
            }
            title={selectedPlace.name}
            right={
              <PlaceActions
                size="sm"
                className="ml-auto"
                placeId={selectedPlace.id}
                bookmarked={selectedPlace.bookmarked}
                onClose={onClose}
                readOnly={Boolean(shareToken)}
              />
            }
          />
        ) : null}
        <div className="relative" style={{ height: contentHeight }}>
          <div
            ref={scrollRef}
            onScroll={(e) => {
              if (!isFull) return;
              setIsScrolled(e.currentTarget.scrollTop > SCROLL_HIDE_HANDLE_THRESHOLD);
            }}
            style={scrollerStyle}
            // 검색 오버레이가 이 영역을 덮는 동안엔 완전히 죽여둔다 — 안 그러면 오버레이 위의
            // 드래그/탭이 아래 목록 카드의 클릭으로 새는 경우가 있다(빠르게 내리는 제스처가
            // 카드 클릭으로 오인되면 handlePlaceClick 이 검색모드를 강제 종료해 버림, QA).
            inert={isSearchMode || undefined}
            className={cn(
              'flex h-full flex-col gap-3 px-4',
              canScroll ? 'overflow-y-auto overscroll-contain' : 'overflow-hidden',
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
                  shareToken={shareToken}
                  userCoords={userCoords}
                  onClose={onClose}
                  onSelectPlace={onSelectPlace}
                />
              ) : // isPlaceDetailPending — 아직 상세 응답 전이라 아무것도 그리지 않는다
              // (ArchivePage 와 같은 정책: 로딩 문구가 잠깐 스쳐 지나가지 않게 한다).
              null
            ) : (
              <>
                <div className="flex shrink-0 items-center justify-between">
                  <p className="text-b1 font-medium text-gray-90">최근 저장한 공간</p>
                  <button
                    type="button"
                    aria-label="저장한 공간 검색"
                    onClick={onEnterSearch}
                    className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100"
                  >
                    <Icon24MagnifyingGlass />
                  </button>
                </div>
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
                          thumbnailState: place.thumbnailState,
                        }}
                        onClick={() => onSelectPlace(place.id)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* 검색 패널 — 탐색 콘텐츠 위를 오른쪽에서 슬라이드해 덮는다(Figma `검색 추가`). */}
          {isSearchMode ? (
            <div
              className={cn(
                'absolute inset-0 bg-gray-0',
                'transition-transform duration-300 ease-out motion-reduce:transition-none',
                searchSlidIn ? 'translate-x-0' : 'translate-x-full',
              )}
            >
              <PlaceSearchPanel
                canScroll={canScroll}
                // 오버레이는 탐색 스크롤러와 같은 높이 래퍼를 쓰지만 스크롤 영역은 제 것이라,
                // 스냅 보정 패딩(scrollerStyle)을 직접 넘겨야 mid 스냅에서도 목록 끝에 닿는다.
                scrollPaddingBottom={scrollerStyle.paddingBottom}
                onExit={slideOutSearch}
                onSelectPlace={onSelectPlace}
                onInputFocus={onSearchInputFocus}
              />
            </div>
          ) : null}
        </div>

        {/* 스크롤을 내린 동안만 뜨는 "위로가기"(Figma `Button/48_up`). */}
        {showStickyHeader ? (
          <FloatingButton
            floating={false}
            size="lg"
            tone="light"
            aria-label="맨 위로"
            onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
            className="-translate-x-1/2 absolute bottom-[calc(2.5rem+env(safe-area-inset-bottom))] left-1/2 shadow-lg"
          >
            <Icon16ArrowDown className="rotate-180" />
          </FloatingButton>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
