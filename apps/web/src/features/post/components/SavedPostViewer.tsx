import { isVideoUrl } from '@/shared/lib/media';
import { useSwipeDownToDismiss } from '@/shared/lib/useSwipeDownToDismiss';
import { BackButton, Carousel, Header, Media, VideoPlayer } from '@/shared/ui';
import type { Post } from '../types';
import { OriginalPostLink } from './OriginalPostLink';

/**
 * Figma `8월 21일 작업 > 게시물 보기`(177:23785).
 *
 * 장소 상세의 저장된 게시물에서 미디어를 누르면 열리는 확대뷰. 미디어를 화면 폭 꽉 채워
 * 보여주고 그 아래에 제목과 본문을 붙인다 — 카드에서 2줄로 접혀 있던 본문을 여기선
 * 전문으로 보여주는 게 이 화면의 목적이라 `ExpandableCaption` 을 쓰지 않는다.
 *
 * 라우트가 아니라 상세 위에 얹는 오버레이라(뒤로가기 = 닫기) 사용처가 열림 상태를 소유한다.
 */
/** 시안의 미디어 프레임 — 375x469. */
const FRAME_CLASS = 'aspect-[375/469] w-full object-cover';

export interface SavedPostViewerProps {
  post: Post;
  /** 게시물 제목. `Post` 가 아니라 게시물 상세(`PostDetail.title`)에 있는 값이라 따로 받는다. */
  title?: string;
  /** 처음 보여줄 미디어 위치. 카드에서 누른 그 미디어부터 시작한다. */
  initialIndex?: number;
  onClose: () => void;
}

function SavedPostViewer({ post, title, initialIndex = 0, onClose }: SavedPostViewerProps) {
  const images = post.images ?? [];
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
      <div
        className="relative mx-auto flex h-full w-full max-w-[450px] flex-col"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          translate: `0 ${swipe.offset}px`,
          transition: swipe.returning ? 'translate 200ms ease-out' : undefined,
        }}
      >
        <Header left={<BackButton onClick={onClose} />} />

        {/* 본문이 길면 이 안에서만 스크롤된다 — 뒤 화면(장소 상세)까지 밀리면 안 된다. */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {/* 슬라이드가 화면 폭과 같아 스냅의 좌측 여백을 없앤다. */}
          <Carousel padded={false} gap={0} initialIndex={initialIndex} className="w-full">
            {images.map((src, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: 고정 순서 목록
              <div key={index} className="w-full">
                {isVideoUrl(src) ? (
                  <VideoPlayer src={src} className={FRAME_CLASS} />
                ) : (
                  <Media src={src} className={FRAME_CLASS} />
                )}
              </div>
            ))}
          </Carousel>

          <div className="flex flex-col gap-2 px-4 pt-3">
            {title ? <h1 className="text-h2 font-semibold text-gray-100">{title}</h1> : null}
            {/* 본문은 접지 않는다 — 전문을 보러 들어온 화면이다. 원문 줄바꿈을 살린다. */}
            {post.caption ? (
              <p className="whitespace-pre-wrap text-b2 text-gray-90">{post.caption}</p>
            ) : null}
          </div>

          {post.originalUrl ? (
            <div className="w-full px-4 py-4">
              <OriginalPostLink label={post.authorHandle} href={post.originalUrl} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export { SavedPostViewer };
