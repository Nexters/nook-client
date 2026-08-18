import { useSwipeDownToDismiss } from '@/shared/lib/useSwipeDownToDismiss';
import { BackButton, Carousel, Header } from '@/shared/ui';

/**
 * Figma `게시물 상세 > 이미지 확대 뷰`.
 * 이미지를 화면 폭 꽉 채워 보여주는 전체화면 레이어. 라우트가 아니라 상세 위에 얹는
 * 오버레이라서(뒤로가기 = 닫기) 사용처가 열림 상태를 소유한다.
 *
 * 슬라이드가 화면 폭과 같아 `padded={false}` 로 스냅의 좌측 여백을 없앤다.
 */
export interface PostImageViewerProps {
  images: string[];
  onClose: () => void;
}

function PostImageViewer({ images, onClose }: PostImageViewerProps) {
  // 헤더 버튼 말고 아래로 쓸어내려서도 닫는다 — 전체화면이라 버튼까지 손이 가기 멀다.
  const swipe = useSwipeDownToDismiss(onClose);

  return (
    // z-70: 전체화면 뷰어라 탭바(60)까지 덮는다.
    <div className="fixed inset-0 z-[70]" {...swipe.handlers}>
      {/* 배경을 따로 깐다 — 쓸어내리는 동안 옅어지며 뒤 화면이 비쳐야 한다. */}
      <div
        className="absolute inset-0 bg-gray-0"
        style={{
          opacity: swipe.backdropOpacity,
          transition: swipe.returning ? 'opacity 200ms ease-out' : undefined,
        }}
      />
      {/* body 포탈로 뜨면 fixed 기준이 뷰포트 전체 폭이라, 데스크톱에서도 셸 폭
          (max-w-[450px], providers.tsx)을 넘지 않게 안쪽에서 다시 묶는다. */}
      <div className="relative mx-auto h-full w-full max-w-[450px]">
        {/* 헤더는 이미지 위에 얹는다 — 자리를 차지하면 그만큼 이미지가 아래로 밀린다. */}
        <div
          className="absolute inset-x-0 top-0 z-10"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <Header left={<BackButton onClick={onClose} />} />
        </div>
        {/* 이미지는 헤더 아래 남은 공간이 아니라 화면 전체를 기준으로 세로 가운데에 온다.
            래퍼는 이미지 비율만큼만 높이를 갖고, 캐러셀을 띄워 얹어 아래에 붙는 점이
            래퍼 높이를 늘리지 못하게 한다 — 점이 가운데 계산에 끼면 이미지가 위로 뜬다. */}
        <div
          className="absolute inset-x-0 top-1/2 aspect-[375/495] -translate-y-1/2"
          style={{
            translate: `0 ${swipe.offset}px`,
            transition: swipe.returning ? 'translate 200ms ease-out' : undefined,
          }}
        >
          <Carousel padded={false} gap={0} className="absolute inset-x-0 top-0">
            {images.map((src, index) => (
              <img
                // 이미지 URL 은 중복될 수 있고 순서가 고정이라 위치를 key 로 쓴다.
                // biome-ignore lint/suspicious/noArrayIndexKey: 고정 순서 목록
                key={index}
                src={src}
                alt=""
                className="aspect-[375/495] w-full object-cover"
              />
            ))}
          </Carousel>
        </div>
      </div>
    </div>
  );
}

export { PostImageViewer };
