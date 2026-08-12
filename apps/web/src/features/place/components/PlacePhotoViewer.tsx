import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon24Back, Icon24Close } from '@/shared/icons/NookIcons';
import { Badge, Carousel, Header, Thumbnail } from '@/shared/ui';

/**
 * Figma `업체 사진 클릭시`(126:14414) / `이미지 클릭`(126:14499).
 *
 * 장소 사진 전체보기 — 2열 그리드로 열리고, 한 장을 누르면 같은 레이어 안에서
 * 전체화면 확대뷰로 바뀐다. 라우트가 아니라 상세 위에 얹는 오버레이라(뒤로가기 = 닫기)
 * 열림 상태는 사용처가 소유하고, 그리드↔확대뷰 전환만 여기서 갖는다.
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
  // null 이면 그리드, 숫자면 그 인덱스에서 시작하는 확대뷰.
  const [zoomedIndex, setZoomedIndex] = useState<number | null>(null);
  // 확대뷰에서 지금 보고 있는 사진. 시작 위치는 그리드에서 누른 칸이고, 이후엔 캐러셀이 알려준다.
  const [active, setActive] = useState(0);

  // body 로 포탈한다 — 이 뷰어를 여는 장소 상세는 vaul 드로어 안에 있고, 드로어는 스냅을
  // transform 으로 움직인다. transform 이 걸린 조상은 fixed 의 기준 박스가 되어버려서
  // 포탈 없이는 화면 전체가 아니라 드로어 안쪽만 덮는다.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col bg-gray-0"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <Header
        left={
          <button
            type="button"
            // 확대뷰에서는 그리드로 되돌아가고, 그리드에서는 오버레이를 닫는다.
            onClick={() => (zoomedIndex === null ? onClose() : setZoomedIndex(null))}
            aria-label="뒤로"
          >
            <Icon24Back />
          </button>
        }
        title={title}
        right={
          <button type="button" onClick={onClose} aria-label="닫기">
            <Icon24Close />
          </button>
        }
      />

      {zoomedIndex === null ? (
        // 카드 크기는 "최근 저장한 공간" 그리드와 같다(시안 167.5x208).
        <div className="grid flex-1 auto-rows-min grid-cols-2 gap-2 overflow-y-auto px-4 pb-4">
          {photos.map((src, index) => (
            <button
              // 사진 URL 은 중복될 수 있고 순서가 고정이라 위치를 key 로 쓴다.
              // biome-ignore lint/suspicious/noArrayIndexKey: 고정 순서 목록
              key={index}
              type="button"
              onClick={() => {
                setZoomedIndex(index);
                setActive(index);
              }}
              aria-label={`${index + 1}번째 사진 크게 보기`}
            >
              <Thumbnail src={src} alt="" className="aspect-[167/208] h-auto w-full" />
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-1 items-center">
          {/* 사진 태그의 기준 박스 — 이 래퍼 높이가 곧 사진 높이라 태그가 사진 우상단에 앉는다
              (flex-1 영역 기준으로 잡으면 세로 가운데 정렬된 사진보다 훨씬 위로 뜬다). */}
          <div className="relative w-full">
            {/* 슬라이드가 화면 폭과 같아 스냅의 좌측 여백을 없앤다. */}
            <Carousel
              padded={false}
              gap={0}
              initialIndex={zoomedIndex}
              onActiveIndexChange={setActive}
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
      )}
    </div>,
    document.body,
  );
}

export { PlacePhotoViewer };
