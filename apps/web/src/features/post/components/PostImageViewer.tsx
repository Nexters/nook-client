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
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-gray-0"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <Header left={<BackButton onClick={onClose} />} />
      <div className="flex flex-1 items-center">
        <Carousel padded={false} gap={0} className="w-full">
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
  );
}

export { PostImageViewer };
