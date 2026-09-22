import { useState } from 'react';
import { SlideScreen, useSlideScreen } from '@/app/slide-screen';
import { Icon24Back } from '@/shared/icons/NookIcons';
import { AllowBackGesture } from '@/shared/lib/backGesture';
import { useHistoryBackedFlag } from '@/shared/lib/useHistoryBackedFlag';
import { useSwipeDownToDismiss } from '@/shared/lib/useSwipeDownToDismiss';
import { Badge, Carousel, Header, Thumbnail } from '@/shared/ui';

/**
 * Figma `업체 사진 클릭시`(126:14414) / `이미지 클릭`(126:14499).
 *
 * 장소 사진 전체보기 — 2열 그리드로 열리고, 한 장을 누르면 그 위에 전체화면 확대뷰가
 * 얹힌다. 라우트가 아니라 장소 상세 위에 얹는 오버레이라 그리드의 열림 상태는 사용처가
 * 소유한다.
 *
 * 두 화면 모두 헤더에는 좌상단 뒤로가기 하나뿐이다 — 예전엔 우상단 닫기(X)가 함께 있어
 * 같은 이탈 동작이 둘로 보였다. 떠나는 길은 좌→우로 밀려 나가는 전환 하나로 모은다
 * (`useSlideScreen` 의 `enter: false` — 들어올 때는 예전처럼 그대로 뜬다).
 *
 * `PostImageViewer` 와 확대뷰 모양은 같지만 이쪽은 그리드 단계와 `2/6` 사진 태그가 있어
 * 공용으로 올리지 않고 장소 쪽 컴포넌트로 둔다.
 */
export interface PlacePhotoViewerProps {
  title: string;
  photos: string[];
  onClose: () => void;
}

function PlacePhotoViewer({ title, photos, onClose }: PlacePhotoViewerProps) {
  // 확대뷰를 히스토리 엔트리로 승격한다. 컴포넌트 state 로 두면 뒤로가기 세 경로(헤더
  // 버튼·Android 하드웨어 백·iOS 엣지 스와이프) 중 버튼만 그리드로 돌아오고, 나머지 둘은
  // 오버레이 전체를 닫아 장소 화면까지 나가버린다 — 실제로 그 증상으로 올라온 버그다.
  const [zoomed, openZoom, closeZoom] = useHistoryBackedFlag('placePhotoZoom');
  // 확대뷰가 시작할 사진. 열림 여부는 위 히스토리 플래그가 소유하고, 인덱스는 거기 딸린
  // 부가 정보라 컴포넌트 state 로 든다(게시물 상세의 이미지 뷰어와 같은 구조).
  const [zoomedIndex, setZoomedIndex] = useState(0);

  // 들어올 때는 전환 없이 그대로 뜬다 — 떠날 때만 좌→우로 밀려 나간다.
  const grid = useSlideScreen({ close: onClose, enter: false });

  return (
    // z-70: 전체화면 오버레이라 탭바(60)까지 덮는다. body 포탈은 SlideScreen 이 한다 —
    // 이 뷰어를 여는 장소 상세는 vaul 드로어 안이고, 드로어는 스냅을 transform 으로
    // 움직여 그 조상이 fixed 의 기준 박스가 되어버린다(포탈 없이는 드로어 안쪽만 덮는다).
    <SlideScreen slidIn={grid.slidIn} className="z-[70]">
      {/* 전체화면 + 헤더 좌상단 뒤로가기 = iOS 좌측 스와이프 허용 화면. 공용 BackButton 은
          히스토리 뒤로 고정이라, 전환을 먼저 태우는 이 화면에서는 직접 그린다. */}
      <AllowBackGesture />
      <div style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <Header
          left={
            <button type="button" onClick={grid.slideOut} aria-label="뒤로">
              <Icon24Back />
            </button>
          }
          title={title}
        />
      </div>

      {/* 카드 크기는 "최근 저장한 공간" 그리드와 같다(시안 167.5x208). */}
      <div className="grid flex-1 auto-rows-min grid-cols-2 gap-2 overflow-y-auto overscroll-contain px-4 pb-4">
        {photos.map((src, index) => (
          <button
            // 사진 URL 은 중복될 수 있고 순서가 고정이라 위치를 key 로 쓴다.
            // biome-ignore lint/suspicious/noArrayIndexKey: 고정 순서 목록
            key={index}
            type="button"
            onClick={() => {
              setZoomedIndex(index);
              openZoom();
            }}
            aria-label={`${index + 1}번째 사진 크게 보기`}
          >
            <Thumbnail src={src} alt="" className="aspect-[167/208] h-auto w-full" />
          </button>
        ))}
      </div>

      {zoomed ? (
        <PlacePhotoZoom
          title={title}
          photos={photos}
          initialIndex={zoomedIndex}
          onClose={closeZoom}
        />
      ) : null}
    </SlideScreen>
  );
}

/**
 * 사진 한 장을 화면 가득 보는 확대뷰. 그리드 위에 얹히고, 떠날 때는 그리드로 돌아간다
 * (장소 상세까지 나가지 않는다 — 열림 상태가 히스토리 엔트리라 세 경로 모두 여기로 모인다).
 */
function PlacePhotoZoom({
  title,
  photos,
  initialIndex,
  onClose,
}: {
  title: string;
  photos: string[];
  initialIndex: number;
  onClose: () => void;
}) {
  // 지금 보고 있는 사진. 시작 위치는 그리드에서 누른 칸이고, 이후엔 캐러셀이 알려준다.
  const [active, setActive] = useState(initialIndex);
  const screen = useSlideScreen({ close: onClose, enter: false });
  // 헤더 버튼 말고 아래로 쓸어내려서도 그리드로 돌아간다 — 전체화면이라 버튼까지 손이 멀다.
  // 가로로 쓸어 닫는 제스처를 두지 않는 이유는 이 화면이 통째로 가로 캐러셀이어서다.
  const swipe = useSwipeDownToDismiss(screen.slideOut);

  return (
    // z-71: 같은 오버레이 안에서 그리드 위에 얹힌다.
    <SlideScreen slidIn={screen.slidIn} className="z-[71] bg-transparent">
      {/* 배경을 따로 깐다 — 쓸어내리는 동안 옅어지며 그리드가 비쳐야 한다. */}
      <div
        className="absolute inset-0 bg-gray-0"
        style={{
          opacity: swipe.backdropOpacity,
          transition: swipe.returning ? 'opacity 200ms ease-out' : undefined,
        }}
      />
      {/* 확대뷰는 이미지를 화면 전체 기준으로 앉히므로 헤더가 그 위에 얹힌다. */}
      <div className="relative z-10" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <Header
          left={
            <button type="button" onClick={screen.slideOut} aria-label="뒤로">
              <Icon24Back />
            </button>
          }
          title={title}
        />
      </div>

      {/* 헤더 아래 남은 공간이 아니라 화면 전체를 기준으로 사진을 세로 가운데에 둔다. */}
      <div className="fixed inset-0 flex items-center" {...swipe.handlers}>
        {/* 사진 태그의 기준 박스 — 이 래퍼 높이가 곧 사진 높이라 태그가 사진 우상단에 앉고,
            아래에 붙는 점은 높이 밖으로 넘겨 가운데 계산에서 뺀다. */}
        <div
          className="relative aspect-[375/495] w-full"
          style={{
            translate: `0 ${swipe.offset}px`,
            transition: swipe.returning ? 'translate 200ms ease-out' : undefined,
          }}
        >
          {/* 슬라이드가 화면 폭과 같아 스냅의 좌측 여백을 없앤다. */}
          <Carousel
            padded={false}
            gap={0}
            initialIndex={initialIndex}
            onActiveIndexChange={setActive}
            className="absolute inset-x-0 top-0"
          >
            {photos.map((src, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: 고정 순서 목록
              <div key={index} className="w-full">
                <img src={src} alt="" className="aspect-[375/495] w-full object-cover" />
              </div>
            ))}
          </Carousel>
          {/* 넘겨도 제자리에 머문다 — 사진이 아니라 "6장 중 몇 번째"라는 캐러셀의 상태다. */}
          {photos.length > 1 ? (
            <Badge variant="photo" className="absolute top-2.5 right-2.5">
              {active + 1}/{photos.length}
            </Badge>
          ) : null}
        </div>
      </div>
    </SlideScreen>
  );
}

export { PlacePhotoViewer };
