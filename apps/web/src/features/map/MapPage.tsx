import { useEffect, useRef, useState } from 'react';
import { useNavigationType, useSearchParams } from 'react-router-dom';
import { useBottomMenuVisibility } from '@/app/bottom-menu-visibility';
import { MainTabPageLayout } from '@/app/layouts/MainTabPageLayout';
import { useIsAuthenticated } from '@/features/auth/session/AuthSessionProvider';
import { useLoginGate } from '@/features/auth/session/useLoginGate';
import { MapView, type MapViewHandle } from '@/features/map/components/MapView';
import { PlaceSheet } from '@/features/map/components/PlaceSheet';
import { RecenterButton } from '@/features/map/components/RecenterButton';
import {
  DETAIL_COMPACT_SNAP_POINT,
  DETAIL_PAGE_SNAP_POINT,
  FULL_SNAP_POINT,
  MID_SNAP_POINT,
  PEEK_SNAP_POINT,
} from '@/features/map/constants';
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

/** `/map?placeId=123` 의 placeId 파라미터를 파싱한다. 없거나 숫자가 아니면 null. */
function parsePlaceIdParam(raw: string | null): number | null {
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * 상세 높이 복원용 `?snap=` 파라미터 — 상세 모드에서 머무를 수 있는 스냅만 유효값으로
 * 인정한다(peek 은 상세 스냅이 아니라 기록될 일이 없다). 그 외 값이면 무시하고 기본
 * 높이로 연다.
 */
function parseSnapParam(raw: string | null): number | null {
  if (!raw) return null;
  const parsed = Number(raw);
  return parsed === DETAIL_COMPACT_SNAP_POINT ||
    parsed === DETAIL_PAGE_SNAP_POINT ||
    parsed === FULL_SNAP_POINT
    ? parsed
    : null;
}

export function MapPage() {
  const location = useCurrentLocation();
  const { setHidden: setBottomMenuHidden } = useBottomMenuVisibility();
  const mapRef = useRef<MapViewHandle>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  // 선택된 장소는 컴포넌트 state 가 아니라 URL(`?placeId=`)이 원본이다 — 딥링크(연관 장소
  // 클릭 등)로 들어와도 핀을 직접 클릭한 것과 같고, 아카이브 상세 등으로 나갔다 뒤로
  // 돌아오면 히스토리 엔트리의 URL 로 보던 장소 상세가 그대로 복원되며, 새로고침에도
  // 살아남는다. 상세를 펼쳐 본(`?snap=`) 높이도 같은 이유로 URL 에 실려 함께 복원된다.
  const isAuthenticated = useIsAuthenticated();
  const { open: openLoginWall, wall: loginWall } = useLoginGate();
  const requestedPlaceId = parsePlaceIdParam(searchParams.get('placeId'));
  // 공유 아카이브에서 딥링크로 들어온 경우 함께 실리는 토큰 — 있으면 상세를 내 API
  // 대신 공유 공개 API 로 조회하고(usePlaceDetail), 저장 토글·메모 편집 등 편집 액션도
  // 숨긴다(PlaceSheet → PlaceDetail). 공유 링크로 들어온 화면은 이미 저장한 장소라도
  // 공유자 기준 읽기 전용으로 보여준다는 정책이다.
  const shareToken = searchParams.get('shareToken');
  // 게스트는 상세 쿼리가 막혀 있어 그릴 내용이 없다 — 선택을 무시해 평범한 지도로 두고,
  // 대신 아래 effect 가 왜 안 열리는지 월로 알려준다(취소해도 빈 상세에 갇히지 않는다).
  const selectedPlaceId = isAuthenticated ? requestedPlaceId : null;
  const [requestedSnap, setSnap] = useState<number | string | null>(() => {
    if (selectedPlaceId === null) return PEEK_SNAP_POINT;
    return parseSnapParam(searchParams.get('snap')) ?? DETAIL_PAGE_SNAP_POINT;
  });
  // 뒤로가기(POP)로 장소가 선택된 채 마운트됐다면 보던 화면으로 "돌아온" 것이지 시트가
  // 새로 "열린" 게 아니다 — 시트가 아래에서 올라오는 오프닝 모션을 생략하고 보던 높이에
  // 즉시 둔다. 앞으로 가기(딥링크 push 등) 진입은 지금처럼 슬라이드로 연다. 마운트
  // 시점의 판정만 쓰므로 useState 초기값으로 고정한다(새로고침도 POP 이라 함께 즉시 뜬다).
  const navigationType = useNavigationType();
  const [instantSheetOpen] = useState(navigationType === 'POP' && selectedPlaceId !== null);
  // 지도의 실제 idle 이벤트로 받은 경계. 아직 한 번도 못 받았으면(최초 마운트 직후,
  // 혹은 최초 idle이 지도 생성과 한 프레임 차이로 마운트와 경합해 유실됐을 경우 포함)
  // null로 남아 있고, 그동안은 아래 `effectiveBounds`가 현재 위치 기준 근사값으로 대신한다
  // — 그래서 실제 idle을 영영 못 받아도 핀 조회 자체가 멈추지 않는다.
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  // 검색 패널은 히스토리에 승격하지 않는다 — iOS 엣지 스와이프는 화면 전체를 덮는 것에만
  // 반응해야 하고(제품 결정), 이 패널은 시트 안에서 탐색 콘텐츠만 덮어 화면 높이를 채우지
  // 않는다. 그래서 스와이프는 여기서도 "지도를 떠난다"가 맞다. 좌상단 뒤로가기는 버튼이
  // 직접, Android 하드웨어 백은 useSlideScreen 의 인터셉터가 받는다.
  const [isSearchMode, setIsSearchMode] = useState(false);

  // 공유 링크(`?placeId=`)로 들어온 게스트에게 왜 상세가 안 열리는지 알려준다.
  useEffect(() => {
    if (isAuthenticated || requestedPlaceId === null) return;
    openLoginWall('저장한 장소를 보려면 로그인이 필요해요');
  }, [isAuthenticated, requestedPlaceId, openLoginWall]);

  const fallbackCenter =
    location.status === 'resolved' ? (location.coords ?? FALLBACK_CENTER) : FALLBACK_CENTER;
  const effectiveBounds = bounds ?? toInitialBounds(fallbackCenter);

  const pinsQuery = useMapPins(effectiveBounds);
  const recentPlacesQuery = useRecentPlaces();
  const placeDetailQuery = usePlaceDetail(selectedPlaceId, shareToken);

  // 선택된 장소의 핀은 bbox 조회를 기다리지 않고 상세 응답으로 바로 그린다.
  // bbox 조회(/places/map)는 (1) 초기엔 현재 위치 기준이라 멀리 있는 선택 장소가
  // 빠져 있고, (2) 팬이 끝나 idle 이 발화해야 재조회되며, (3) 애초에 북마크된
  // 장소만 내려줘서 북마크 안 된 연관 장소는 영영 안 내려온다 — 선택돼 있는 동안은
  // 상세 응답의 좌표로 핀을 보장한다. 지도 이동(panTarget)과 같은 데이터 소스라
  // 핀과 이동이 항상 같이 일어난다.
  const bboxPins = pinsQuery.data ?? [];
  const selectedPlace = selectedPlaceId !== null ? (placeDetailQuery.data ?? null) : null;

  // 사진이 없는 장소에는 detailPage 스냅이 아예 없다(DETAIL_SNAP_POINTS_WITHOUT_PHOTOS).
  // 상세가 오기 전엔 사진 유무를 몰라 기본 높이(detailPage)로 열어두므로, 사진 없음이
  // 확정되면 그 높이를 detailCompact 로 접어 앉힌다. 이펙트로 setSnap 하지 않고 렌더에서
  // 파생하는 이유: 이펙트는 한 프레임 늦게 도는데, 그 사이 시트는 이미 새 스냅 배열로
  // 그려져 목록에 없는 스냅을 붙잡는다.
  const snap =
    selectedPlace && selectedPlace.photos.length === 0 && requestedSnap === DETAIL_PAGE_SNAP_POINT
      ? DETAIL_COMPACT_SNAP_POINT
      : requestedSnap;
  const pins =
    selectedPlace && !bboxPins.some((pin) => pin.id === selectedPlace.id)
      ? [
          ...bboxPins,
          {
            id: selectedPlace.id,
            lat: selectedPlace.lat,
            lng: selectedPlace.lng,
            name: selectedPlace.name,
            // 상세 응답(`GET /places/{placeId}`)엔 아카이브 색상이 없다 — bbox 조회에 이 장소가
            // 들어오면 그때 실제 색으로 교체된다(이 임시 핀은 그 전까지만 존재한다).
            color: 'cement' as const,
            thumbnail: selectedPlace.thumbnail,
          },
        ]
      : bboxPins;

  useEffect(() => {
    // 검색 모드도 상세처럼 시트가 화면을 채우는 상태라 하단 탭바를 함께 숨긴다(Figma `검색 추가`).
    setBottomMenuHidden(selectedPlaceId !== null || isSearchMode);
    return () => setBottomMenuHidden(false);
  }, [selectedPlaceId, isSearchMode, setBottomMenuHidden]);

  // 선택이 풀리면 "최근 저장한 공간" 목록을 최소 높이로 되돌린다. 핸들러를 거치지 않고
  // URL 에서 ?placeId 만 사라지는 경로도 여기로 수렴한다 — 장소 선택 상태에서 하단 탭
  // "지도"를 다시 누르면 같은 라우트로의 이동이라 remount 없이 파라미터만 빠진다(QA:
  // 그때도 목록 + 최소 높이로). 상세 전용 스냅(detailCompact·detailPage)은 목록 모드
  // 스냅 배열(BROWSE_SNAP_POINTS)에 없기도 해서, 남겨두면 시트가 갈 곳을 잃는다.
  useEffect(() => {
    if (selectedPlaceId === null) setSnap(PEEK_SNAP_POINT);
  }, [selectedPlaceId]);

  if (location.status === 'loading') {
    return (
      <div className="flex h-dvh w-full items-center justify-center">
        <p className="text-b2 text-gray-60">위치 확인 중…</p>
      </div>
    );
  }

  /**
   * 선택 변경은 URL 에 replace 로 반영한다 — 히스토리를 쌓지 않아 뒤로가기는 지도
   * "이전 화면"으로 나가는 기존 동작 그대로고, 아카이브 상세처럼 push 로 떠난 화면에서
   * 뒤로 돌아올 때만 마지막 선택이 복원된다.
   */
  function setSelectedPlaceId(id: number | null) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        // 스냅 기록과 공유 토큰은 보고 있던 장소에 대한 것이라, 선택이 바뀌거나 풀리면 함께 버린다.
        next.delete('snap');
        next.delete('shareToken');
        if (id === null) next.delete('placeId');
        else next.set('placeId', String(id));
        return next;
      },
      { replace: true },
    );
  }

  function handlePlaceClick(id: number) {
    setSelectedPlaceId(id);
    setSnap(DETAIL_PAGE_SNAP_POINT); // detailPage 스냅으로 열어 상세를 보여준다
    // 검색 결과에서 골랐어도 상세가 콘텐츠를 통째로 대체하므로 검색은 그대로 닫는다.
    setIsSearchMode(false);
  }

  function handleSnapChange(next: number | string | null) {
    // 게스트가 시트를 끌어올리면 목록 대신 월이 뜬다. snap 은 그대로 두므로 시트는 peek 에 남는다.
    if (!isAuthenticated) {
      openLoginWall('저장한 공간을 보려면 로그인이 필요해요');
      return;
    }

    setSnap(next);
    // 예전엔 peek 까지 내려가면 선택을 풀었지만, 이제 상세의 최저점은 detailCompact 라
    // 끌어내려도 목록으로 나가지 않는다 — 나가는 길은 헤더의 닫기 버튼뿐이다(QA).
    // 상세를 보는 동안 스냅이 바뀌면 URL 에 기록한다(다른 화면으로 갔다 뒤로 돌아올 때
    // 보던 높이 그대로 복원). 기본 높이(detailPage)는 파라미터 없이도 같으므로 지워서
    // 평소 URL 을 깨끗하게 유지한다.
    if (selectedPlaceId !== null) {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          if (next === DETAIL_PAGE_SNAP_POINT) params.delete('snap');
          else params.set('snap', String(next));
          return params;
        },
        { replace: true },
      );
    }
  }

  /**
   * 상세 헤더의 닫기/뒤로 — 목록으로 되돌아가는 유일한 길이다(끌어내리기로는 나갈 수
   * 없다). 선택을 풀면 위 이펙트가 스냅을 peek 으로 되돌린다.
   */
  function handleCloseDetail() {
    setSelectedPlaceId(null);
  }

  function handleEnterSearch() {
    // 검색은 스냅을 직접 올려서 handleSnapChange 를 타지 않는다 — 여기서도 따로 막는다.
    if (!isAuthenticated) {
      openLoginWall('공간을 검색하려면 로그인이 필요해요');
      return;
    }

    setIsSearchMode(true);
    // 스냅은 건드리지 않는다 — 최근 저장한 공간 목록에서 보던 높이 그대로 검색으로
    // 넘어간다. peek 에서 입력에 포커스되면 mid 로 올라간다(handleSearchInputFocus).
  }

  /** 검색 패널의 슬라이드 아웃이 끝난 뒤 호출된다(PlaceSheet 의 useSlideScreen 계약). */
  function handleExitSearch() {
    setIsSearchMode(false);
  }

  /**
   * 검색 중 사용자가 시트를 내린 뒤 입력을 다시 누른 경우 — peek 은 키보드가 시트를
   * 통째로 가리는 높이라 mid 로만 올린다(사용자가 고른 mid/full 은 그대로 존중).
   */
  function handleSearchInputFocus() {
    setSnap((current) => (current === PEEK_SNAP_POINT ? MID_SNAP_POINT : current));
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
        {/* 핀을 눌러 상세(detailPage)까지 올라오는 동안은 드로어를 따라 함께 올라온다.
            그보다 더 펼친 스냅(mid/full)에서는 드로어가 자리를 덮으므로 렌더하지 않는다. */}
        {typeof snap === 'number' && snap <= DETAIL_PAGE_SNAP_POINT && (
          <RecenterButton snapPoint={snap} onClick={() => mapRef.current?.recenter()} />
        )}
        <PlaceSheet
          recentPlaces={recentPlacesQuery.data ?? []}
          selectedPlace={placeDetailQuery.data ?? null}
          shareToken={shareToken}
          isPlaceDetailPending={selectedPlaceId !== null && placeDetailQuery.isPending}
          isPlaceDetailError={selectedPlaceId !== null && placeDetailQuery.isError}
          snap={snap}
          instantOpen={instantSheetOpen}
          userCoords={location.coords}
          isSearchMode={isSearchMode}
          onSnapChange={handleSnapChange}
          onSelectPlace={handlePlaceClick}
          onClose={handleCloseDetail}
          onEnterSearch={handleEnterSearch}
          onExitSearch={handleExitSearch}
          onSearchInputFocus={handleSearchInputFocus}
        />
        {loginWall}
      </div>
    </MainTabPageLayout>
  );
}
