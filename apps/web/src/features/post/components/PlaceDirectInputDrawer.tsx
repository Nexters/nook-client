import { Dialog } from 'radix-ui';
import { useEffect, useState } from 'react';
import { useAppShellContainer } from '@/app/providers';
import type { Place } from '@/features/place';
import type { Post } from '@/features/post';
import { Icon16Location, Icon18MagnifyingGlass, Icon24Delete } from '@/shared/icons/NookIcons';
import { cn } from '@/shared/lib/utils';
import { Button, Drawer, DrawerContent, DrawerTitle } from '@/shared/ui';
import { getMockPlacePosts } from '../mock/placePosts';
import { searchMockPlaces } from '../mock/placeSearchResults';
import { PlaceSearchResultDetail } from './PlaceSearchResultDetail';
import { PostImageViewer } from './PostImageViewer';

export interface PlaceDirectInputDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 장소 상세에서 "추가하기"를 눌렀을 때 호출된다. 이 드로어는 그 후 스스로 닫는다. */
  onPlaceConfirmed: (place: Place) => void;
}

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
}: PlaceDirectInputDrawerProps) {
  const shellContainer = useAppShellContainer();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [activeSnapPoint, setActiveSnapPoint] = useState<number | string | null>(
    PLACE_DETAIL_SNAP_POINTS[0],
  );
  const [viewingPost, setViewingPost] = useState<Post | null>(null);
  const results = searchMockPlaces(query);

  // 배경 페이지가 스크롤된 채로 열리면 vaul 이 "콘텐츠를 스크롤하는 중"으로 오인해
  // 끌어내리기(dismiss) 제스처를 막아버린다 — 열려 있는 동안만 문서 스크롤 위치를 고정해
  // 화면은 그대로 두면서 vaul 의 드래그 판정(scrollTop === 0)은 항상 통과하게 한다.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const scrollY = root.scrollTop;
    const previous = {
      position: root.style.position,
      top: root.style.top,
      width: root.style.width,
    };
    root.style.position = 'fixed';
    root.style.top = `-${scrollY}px`;
    root.style.width = '100%';
    return () => {
      root.style.position = previous.position;
      root.style.top = previous.top;
      root.style.width = previous.width;
      root.scrollTop = scrollY;
    };
  }, [open]);

  // "추가하기" 확정처럼 부모가 `open` prop 을 직접 false 로 바꿔 닫는 경우, vaul 의
  // onOpenChange 콜백은 호출되지 않는다(그건 드로어 스스로 닫힐 때만 불린다) — 닫히는
  // 계기와 무관하게 항상 초기화되도록 `open` 값 자체를 감시한다.
  useEffect(() => {
    if (open) return;
    setQuery('');
    setSelectedPlace(null);
    setActiveSnapPoint(PLACE_DETAIL_SNAP_POINTS[0]);
    setViewingPost(null);
  }, [open]);

  return (
    <>
      <Drawer
        open={open}
        onOpenChange={onOpenChange}
        container={shellContainer}
        snapPoints={selectedPlace ? PLACE_DETAIL_SNAP_POINTS : undefined}
        activeSnapPoint={selectedPlace ? activeSnapPoint : undefined}
        setActiveSnapPoint={selectedPlace ? setActiveSnapPoint : undefined}
      >
        <DrawerContent
          className={cn(
            'flex flex-col',
            // vaul 은 snapPoints 를 뷰포트가 아니라 `container` prop(앱 셸, providers.tsx)의
            // 박스 높이 비율로 계산해 transform 으로 감춘다 — 셸 높이가 실제 뷰포트 높이와
            // 같아지는 건 이 드로어를 호스팅하는 페이지 자체가 `h-dvh` + 내부 스크롤로 뷰포트
            // 높이에 갇혀 있을 때뿐이다(PostDetailPage/GroupPage/MapPage 가 그 패턴을 따른다) —
            // 그렇지 않고 페이지가 뷰포트보다 길어지면 셸도 같이 늘어나 모든 스냅 비율이 틀어진다.
            // 이와 별개로, 드로어 엘리먼트 자체는 항상 셸 전체 높이(h-dvh)여야 그 계산이 맞고
            // 지금 보이는 스냅만큼만 잘려 보인다. 콘텐츠 길이에 맞춰 자동으로 줄어들게
            // 두면(높이 지정 없음) collapsed 스냅에서 대부분이 화면 밖으로 밀려난다.
            selectedPlace ? 'h-dvh overflow-hidden' : 'h-[90dvh] px-4 pb-11',
          )}
        >
          <DrawerTitle className="sr-only">
            {selectedPlace ? `${selectedPlace.name} 상세` : '장소 직접 입력'}
          </DrawerTitle>

          {selectedPlace ? (
            <PlaceSearchResultDetail
              place={selectedPlace}
              posts={getMockPlacePosts(selectedPlace.id)}
              expanded={activeSnapPoint === PLACE_DETAIL_SNAP_POINTS[1]}
              onSelectPost={setViewingPost}
            />
          ) : (
            <>
              {/* 앞에 돋보기 아이콘 슬롯이 필요해 공용 `Input` (@/shared/ui) 을 못 쓰고 직접 구현한다 —
                  대신 포커스 보더/클리어 버튼 동작은 `Input` 과 동일하게 맞춘다. */}
              <div className="flex h-11 w-full shrink-0 items-center gap-2 rounded-lg border border-gray-30 px-3 transition-colors focus-within:border-gray-100">
                <Icon18MagnifyingGlass className="shrink-0" />
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
                <ul className="mt-5 flex w-full flex-1 flex-col overflow-y-auto">
                  {results.map((place, index) => (
                    <li key={place.id} className={cn(index > 0 && 'border-t border-gray-10')}>
                      <button
                        type="button"
                        onClick={() => setSelectedPlace(place)}
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
                            {place.address} · {place.distance}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          )}
        </DrawerContent>
      </Drawer>

      {open && selectedPlace && !viewingPost ? (
        // vaul 이 snapPoints 를 표현하려고 드로어 엘리먼트 전체를 transform 으로 밀어
        // 올리는데, 그 안의 자식은 collapsed 스냅에서 화면 밖(엘리먼트 실제 바닥)으로
        // 같이 밀려난다 — 스냅과 무관하게 항상 보여야 하는 이 바는 드로어 밖, 뷰포트
        // 기준 fixed 로 따로 그린다(Figma 시안도 시트와 겹치는 별도 레이어다).
        //
        // Drawer(vaul)가 모달로 열려 있는 동안 `aria-hidden` 패키지의 hideOthers() 가 이
        // 형제 엘리먼트에 aria-hidden/data-aria-hidden 을 붙이고, 이와 별개로 Radix Dialog 가
        // 모달이 열려 있는 동안 `document.body.style.pointerEvents = 'none'` 을 직접 설정해
        // 클릭도 막아버린다(§PostImageViewer 와 같은 원인). 거기는 "열려있는 동안 배타적으로
        // 대체하는" 오버레이라 별도 Dialog 로 감싸는 게 맞았지만, 이 바는 드로어 콘텐츠와
        // "동시에" 계속 조작 가능해야 해서 같은 방법(중첩 Dialog)을 쓰면 두 모달의 포커스
        // 트랩이 서로 얽혀 브라우저가 멈춘다(실제 확인함) — 여기는 포인터 이벤트만 명시적으로
        // 되살린다. 스크린리더 접근성은 이 바만 놓고 보면 완전하지 않다는 한계가 남는다(후속
        // 과제로 문서화).
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex items-center gap-2.5 border-t border-gray-10 bg-gray-0 px-4 pt-2 pb-8">
          <p className="pointer-events-auto flex-1 text-b2 font-semibold text-gray-80">
            이 장소가 맞나요?
          </p>
          <Button
            size="md"
            onClick={() => onPlaceConfirmed(selectedPlace)}
            className="pointer-events-auto flex-1"
          >
            추가하기
          </Button>
        </div>
      ) : null}

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
          <Dialog.Portal container={shellContainer}>
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
