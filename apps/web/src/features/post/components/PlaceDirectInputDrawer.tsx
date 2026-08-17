import { Dialog } from 'radix-ui';
import { Suspense, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { PlacePreviewMap } from '@/features/map/components/PlacePreviewMap';
import type { Post } from '@/features/post';
import { Icon16Location, Icon24Delete, Icon24MagnifyingGlass } from '@/shared/icons/NookIcons';
import { type Coordinates, getCurrentPosition } from '@/shared/lib/geolocation';
import { useDebouncedValue } from '@/shared/lib/useDebouncedValue';
import { cn } from '@/shared/lib/utils';
import { useToast } from '@/shared/toast';
import { Button, Drawer, DrawerContent, DrawerTitle } from '@/shared/ui';
import { usePlaceSearch } from '../api/queries';
import { buildNaverMapSearchUrl } from '../lib/naverMapLink';
import type { SearchedPlace } from '../types';
import { PlaceSearchResultDetail } from './PlaceSearchResultDetail';
import { PostImageViewer } from './PostImageViewer';

export interface PlaceDirectInputDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 장소 상세에서 "추가하기"를 눌렀을 때 호출된다. 연결(서버 저장)과 닫기는 부모 책임이다. */
  onPlaceConfirmed: (place: SearchedPlace) => void;
  /** 부모의 연결 요청이 진행 중인 동안 "추가하기"를 눌리지 않게 한다. */
  confirmPending?: boolean;
}

/** 검색어 입력 → 검색 API 호출 사이의 디바운스. */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * 검색 단계의 장소는 아직 서버에 연결되지 않아 "이 장소에 연결된 게시물"을 조회할 API 가
 * 없다(검색 응답엔 placeId 가 없다) — 서버가 내려주게 되면 이 빈 목록만 실 데이터로 바꾼다.
 */
const NO_CONNECTED_POSTS: Post[] = [];

/**
 * 검색 목록 모드 전용 스냅(고정 90% 하나뿐) — `snapPoints` 를 이 모드에서도 항상 정의해
 * 둬야, 장소를 선택해 상세 모드로 넘어갈 때 vaul 이 "snapPoints 가 이번에 처음 생겼다"고
 * 보지 않는다. `undefined` 로 뒀다가 상세 진입 시점에 처음 배열을 준다는 이전 방식은,
 * vaul 이 새 스냅 위치를 계산하기 전에 오프셋 0(완전히 펼친 상태)으로 한 프레임 그렸다가
 * 뒤늦게 애니메이션으로 내려앉아 시트가 확 커졌다가 훅 줄어드는 것처럼 보였다 —
 * `map/PlaceSheet.tsx` 가 검색/상세 두 모드 모두에서 스냅을 항상 켜두는 것과 같은 이유.
 */
const PLACE_LIST_SNAP_POINTS: [number] = [0.9];

/** Figma `장소 바텀시트`(장소 상세) collapsed/expanded 스냅 — `map/PlaceSheet` 와 동일 패턴. */
const PLACE_DETAIL_SNAP_POINTS: [number, number] = [0.55, 1];

/**
 * Figma `게시물 상세_직접 입력` — 연관 장소를 못 찾았을 때 사용자가 직접 검색해 넣는 바텀시트.
 *
 * 검색 리스트와 장소 상세는 별도 드로어가 아니라 같은 Drawer 안에서 콘텐츠만 바꾼다
 * (`selectedPlace` 유무로 분기) — `map/PlaceSheet`+`PlaceDetail` 이 이미 쓰는 컨벤션과 동일.
 * 장소 상세 안에서 게시물을 누르면 `PostImageViewer`(기존 오버레이)를 그대로 재사용한다.
 */
function PlaceDirectInputDrawer({
  open,
  onOpenChange,
  onPlaceConfirmed,
  confirmPending = false,
}: PlaceDirectInputDrawerProps) {
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<SearchedPlace | null>(null);
  const [activeSnapPoint, setActiveSnapPoint] = useState<number | string | null>(
    PLACE_LIST_SNAP_POINTS[0],
  );
  const [viewingPost, setViewingPost] = useState<Post | null>(null);

  // 검색 기준 좌표 — 드로어가 열릴 때 1회 조회한다. 권한 거부/미지원이면 null 그대로
  // 좌표 없이 검색해 거리 표기만 빠진다(다이얼로그 없음, geolocation.ts 계약).
  const [coords, setCoords] = useState<Coordinates | null>(null);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getCurrentPosition().then((position) => {
      if (!cancelled) setCoords(position);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const results = usePlaceSearch(debouncedQuery, coords);

  // "추가하기" 확정처럼 부모가 `open` prop 을 직접 false 로 바꿔 닫는 경우, vaul 의
  // onOpenChange 콜백은 호출되지 않는다(그건 드로어 스스로 닫힐 때만 불린다) — 닫히는
  // 계기와 무관하게 항상 초기화되도록 `open` 값 자체를 감시한다.
  useEffect(() => {
    if (open) return;
    setQuery('');
    setSelectedPlace(null);
    setActiveSnapPoint(PLACE_LIST_SNAP_POINTS[0]);
    setViewingPost(null);
  }, [open]);

  return (
    <>
      {/* 장소 상세 모드에서 드로어(시트) 뒤에 깔리는 지도 프리뷰 — 시안의 "지도 위
          바텀시트" 모양을 재현한다. z-40 으로 드로어(z-50)보다 아래, 게시물 상세보다
          위에 둔다. 딤 대신 이 지도가 배경이라 상세 모드에선 오버레이를 끈다(아래
          DrawerContent 의 overlay prop). pointer-events 는 살리지 않는다 — 모달 드로어가
          떠 있는 동안 바깥 클릭은 닫기(dismiss)로 해석되므로 프리뷰는 조작 불가로 둔다. */}
      {open && selectedPlace
        ? createPortal(
            <div className="fixed inset-x-0 top-0 bottom-0 z-40 mx-auto max-w-[450px] bg-gray-10">
              {/* 네이버 지도 스크립트 로드까지(useNavermaps suspend) 회색 배경만 보인다. */}
              <Suspense fallback={null}>
                <PlacePreviewMap
                  place={{
                    name: selectedPlace.name,
                    lat: selectedPlace.latitude,
                    lng: selectedPlace.longitude,
                  }}
                  sheetSnapPoint={PLACE_DETAIL_SNAP_POINTS[0]}
                />
              </Suspense>
            </div>,
            document.body,
          )
        : null}

      {/* 셸 컨테이너가 아니라 기본값(body)으로 포탈한다 — 게시물 상세가 문서 흐름을 따라
          셸이 콘텐츠만큼 길어지므로, 셸 기준으로는 fixed 위치도 snapPoints 비율(vaul 은
          container 박스 높이로 계산한다)도 전부 틀어진다. body 포탈이면 둘 다 뷰포트
          기준이라 항상 맞는다. 데스크톱 폭은 max-w 로 셸 폭에 맞춰 막는다. */}
      <Drawer
        open={open}
        onOpenChange={onOpenChange}
        snapPoints={selectedPlace ? PLACE_DETAIL_SNAP_POINTS : PLACE_LIST_SNAP_POINTS}
        activeSnapPoint={activeSnapPoint}
        setActiveSnapPoint={setActiveSnapPoint}
      >
        <DrawerContent
          overlay={!selectedPlace}
          className={cn(
            'mx-auto flex max-w-[450px] flex-col',
            // 드로어 엘리먼트 자체는 항상 뷰포트 전체 높이(h-dvh)여야 vaul 의 스냅 계산이
            // 맞고 지금 보이는 스냅만큼만 잘려 보인다 — 그래서 목록/상세 모드 상관없이
            // h-dvh 로 고정하고, 모드별 여백/스크롤은 안쪽 래퍼(아래)에서 따로 준다.
            'h-dvh overflow-hidden',
          )}
        >
          <DrawerTitle className="sr-only">
            {selectedPlace ? `${selectedPlace.name} 상세` : '장소 직접 입력'}
          </DrawerTitle>

          {selectedPlace ? (
            <PlaceSearchResultDetail
              place={selectedPlace}
              posts={NO_CONNECTED_POSTS}
              expanded={activeSnapPoint === PLACE_DETAIL_SNAP_POINTS[1]}
              onSelectPost={setViewingPost}
              onAddressCopied={() =>
                showToast({ variant: 'simple', title: '클립보드에 복사되었습니다.' })
              }
            />
          ) : (
            // h-[90dvh] 는 PLACE_LIST_SNAP_POINTS[0](0.9) 와 맞물려 있다 — flex-1 로 두면
            // 이 래퍼가 DrawerContent 의 h-dvh 전체(100%)를 채우는데, 실제로 화면에 보이는
            // 건 그 중 90% 뿐이라 나머지 10%(리스트 하단 + pb-11 여백)가 스크롤로도 닿지
            // 않는 죽은 영역이 된다. 래퍼 자체를 보이는 비율(90dvh)만큼만 잡아야 내부
            // `overflow-y-auto` 가 실제로 전부 스크롤해서 보여줄 수 있다.
            <div className="flex h-[90dvh] flex-col px-4 pb-11">
              {/* 앞에 돋보기 아이콘 슬롯이 필요해 공용 `Input` (@/shared/ui) 을 못 쓰고 직접 구현한다 —
                  대신 포커스 보더/클리어 버튼 동작은 `Input` 과 동일하게 맞춘다. */}
              <div className="flex h-11 w-full shrink-0 items-center gap-2 rounded-lg border border-gray-30 px-3 transition-colors focus-within:border-gray-100">
                <Icon24MagnifyingGlass className="shrink-0" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="장소명을 입력해주세요"
                  className="min-w-0 flex-1 bg-transparent text-b2 font-medium text-gray-100 outline-none placeholder:text-gray-50"
                />
                {focused && query.length > 0 ? (
                  <button
                    type="button"
                    aria-label="입력 지우기"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => setQuery('')}
                    className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100 focus-visible:ring-offset-1"
                  >
                    <Icon24Delete />
                  </button>
                ) : null}
              </div>

              {results.length > 0 ? (
                <ul className="mt-5 flex w-full flex-1 flex-col overflow-y-auto overscroll-contain">
                  {results.map((place, index) => (
                    <li key={place.id} className={cn(index > 0 && 'border-t border-gray-10')}>
                      <button
                        type="button"
                        onClick={() => {
                          // 선택과 동시에 상세 스냅으로 바꿔야 vaul 이 "이미 켜져 있던" 스냅을
                          // 새 값으로 자연스럽게 애니메이션한다(이 파일 상단 PLACE_LIST_SNAP_POINTS
                          // 주석 참고) — 다음 렌더까지 미루면 잠깐 목록 스냅(0.9)으로 있다가
                          // 다시 상세 스냅(0.55)으로 튀는 것처럼 보인다.
                          setSelectedPlace(place);
                          setActiveSnapPoint(PLACE_DETAIL_SNAP_POINTS[0]);
                        }}
                        className="flex w-full items-center gap-2 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100 focus-visible:ring-inset"
                      >
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gray-10">
                          <Icon16Location />
                        </span>
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <div className="flex items-end gap-0.5">
                            <span className="truncate text-b2 font-semibold text-gray-90">
                              {place.name}
                            </span>
                            <span className="shrink-0 text-b3 font-medium text-gray-70">
                              {place.category}
                            </span>
                          </div>
                          <p className="truncate text-b3 font-medium text-gray-80">
                            {/* 좌표 없이 검색하면 거리가 없다 — 구분점째 생략한다. */}
                            {place.distance
                              ? `${place.address} · ${place.distance}`
                              : place.address}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}
        </DrawerContent>
      </Drawer>

      {open && selectedPlace && !viewingPost
        ? // vaul 이 snapPoints 를 표현하려고 드로어 엘리먼트 전체를 transform 으로 밀어
          // 올리는데, 그 안의 자식은 collapsed 스냅에서 화면 밖(엘리먼트 실제 바닥)으로
          // 같이 밀려난다 — 스냅과 무관하게 항상 보여야 하는 이 바는 드로어 밖, 뷰포트
          // 기준 fixed 로 따로 그린다(Figma 시안도 시트와 겹치는 별도 레이어다).
          // body 로 포탈하는 이유는 위 Drawer 와 같다(셸 기준 fixed 는 위치가 틀어진다).
          //
          // Drawer(vaul)가 모달로 열려 있는 동안 `aria-hidden` 패키지의 hideOthers() 가 이
          // 형제 엘리먼트에 aria-hidden/data-aria-hidden 을 붙이고, 이와 별개로 Radix Dialog 가
          // 모달이 열려 있는 동안 `document.body.style.pointerEvents = 'none'` 을 직접 설정해
          // 클릭도 막아버린다(§PostImageViewer 와 같은 원인). 거기는 "열려있는 동안 배타적으로
          // 대체하는" 오버레이라 별도 Dialog 로 감싸는 게 맞았지만, 이 바는 드로어 콘텐츠와
          // "동시에" 계속 조작 가능해야 해서 같은 방법(중첩 Dialog)을 쓰면 두 모달의 포커스
          // 트랩이 서로 얽혀 브라우저가 멈춘다(실제 확인함) — 여기는 포인터 이벤트만 명시적으로
          // 되살린다. 다만 aria-hidden 자체는 풀리지 않고 Drawer 의 포커스 트랩도 이 바까지는
          // 미치지 못해서, 마우스/터치로만 누를 수 있고 키보드·스크린리더로는 이 버튼에 전혀
          // 도달할 수 없다 — "일부 제한"이 아니라 완전히 막힌 상태다(후속 과제로 남겨둔다).
          createPortal(
            <div
              // flex-1 로는 정확히 반반이 안 된다 — flex-basis 0 이어도 각 아이템의
              // 패딩이 바닥 크기로 남아, 패딩이 있는 쪽(공용 Button 의 px-4)이 그만큼
              // 더 넓어진다. grid-cols-2(= minmax(0,1fr) 2칸)는 패딩과 무관하게 반반이다.
              className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] mx-auto grid max-w-[450px] grid-cols-2 items-center gap-3 border-t border-gray-10 bg-gray-0 px-4 pt-2"
              style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}
            >
              {/* 시안 2Button_52 의 좌측(Button_Secondary_52)은 gray-20 배경/gray-90 라벨 —
                  공용 Button 은 전 variant 라벨이 흰색 고정이라 여기서만 지역 스타일로 그린다.
                  https 링크라 웹은 새 탭, 네이티브 셸은 내비게이션 정책대로 시스템 브라우저로
                  열린다(nmap:// 앱 스킴은 셸이 차단 — naverMapLink.ts 주석 참고). */}
              <a
                href={buildNaverMapSearchUrl(selectedPlace)}
                target="_blank"
                rel="noreferrer"
                className="pointer-events-auto flex h-13 items-center justify-center rounded-lg bg-gray-20 text-b1 font-semibold text-gray-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100 focus-visible:ring-offset-2"
              >
                지도에서 보기
              </a>
              <Button
                size="lg"
                onClick={() => onPlaceConfirmed(selectedPlace)}
                disabled={confirmPending}
                className="pointer-events-auto"
              >
                장소 추가
              </Button>
            </div>,
            document.body,
          )
        : null}

      {viewingPost ? (
        // 장소 상세 Drawer 가 열려 있는 동안 겹쳐 뜨는 오버레이라 일반 형제(`fixed` div)로만
        // 두면 Radix 가 Drawer 를 이미 모달로 보고 이 오버레이째로 배경(aria-hidden) 처리해
        // 버린다 — `PostImageViewer` 를 별도 Radix Dialog 로 한 번 더 감싸 "지금 열려 있는
        // 최상단 모달"로 인식시켜야 뒤로가기 버튼 등이 접근 가능한 상태로 남는다.
        <Dialog.Root
          open
          onOpenChange={(next) => {
            if (!next) setViewingPost(null);
          }}
        >
          <Dialog.Portal>
            <Dialog.Content>
              <Dialog.Title className="sr-only">이미지 확대 보기</Dialog.Title>
              <PostImageViewer
                images={viewingPost.images ?? []}
                onClose={() => setViewingPost(null)}
              />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      ) : null}
    </>
  );
}

export { PlaceDirectInputDrawer };
