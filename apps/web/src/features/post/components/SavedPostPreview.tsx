import { createPortal } from 'react-dom';
import { Icon24Back } from '@/shared/icons/NookIcons';
import { AllowBackGesture } from '@/shared/lib/backGesture';
import { Carousel, Header, Media, VideoPlayer } from '@/shared/ui';
import type { Post } from '../types';
import { OriginalPostLink } from './OriginalPostLink';

/**
 * Figma `게시물 상세 > 전체 보기`(240:9819).
 * `SavedPostCard` 의 사진 줄에서 사진 한 장을 누르면 뜨는 확대 뷰 — 라우트 이동
 * (`/post/{id}`) 대신 같은 화면 위에 얹는 오버레이로, 이미지·제목·본문·원본 링크만
 * 보여준다(아카이브 태그·메모·연관 장소는 게시물 상세 페이지 전용이라 여기 없다).
 *
 * `PlacePhotoViewer`·`PostImageViewer` 와 같이 열림 상태는 사용처가 소유한다 — 카드는
 * 게시물 제목(`PostDetail.title`)을 모르고, 뒤로가기 = 닫기라 라우트로도 두지 않는다.
 *
 * 장소 상세와 같은 이유로 body 로 포탈한다 — 이 뷰가 열리는 장소 상세는 vaul 드로어
 * 안에 있고, 드로어는 스냅을 transform 으로 움직여 그 조상이 fixed 의 기준 박스가
 * 되어버린다(포탈 없이는 드로어 안쪽만 덮는다).
 *
 * 본문은 접지 않고 전문을 보여준다(Figma `8월 21일 작업 > 게시물 보기` 177:23785) —
 * 카드에서 2줄로 잘려 있던 걸 마저 읽으러 들어오는 화면이라 여기서 또 접으면 의미가 없다.
 */
/** 시안의 미디어 프레임 — 375x469. */
const FRAME_CLASS = 'aspect-[375/469] w-full object-cover';
export interface SavedPostPreviewProps {
  title: string;
  post: Post;
  /** 처음 보여줄 미디어 위치 — 카드에서 누른 그 미디어부터 연다. */
  initialIndex?: number;
  onClose: () => void;
}

function SavedPostPreview({ title, post, initialIndex = 0, onClose }: SavedPostPreviewProps) {
  const media = post.media ?? [];

  return createPortal(
    // z-70: 전체화면 오버레이라 탭바(60)까지 덮는다.
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-gray-0"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* 전체화면 + 헤더 좌상단 뒤로가기 = iOS 좌측 스와이프 허용 화면. */}
      <AllowBackGesture />
      <Header
        left={
          <button type="button" onClick={onClose} aria-label="게시물 미리보기 닫기">
            <Icon24Back />
          </button>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {media.length > 0 ? (
          <Carousel padded={false} gap={0} initialIndex={initialIndex}>
            {media.map((item, index) =>
              // 미디어 URL 은 중복될 수 있고 순서가 고정이라 위치를 key 로 쓴다.
              // 확대해서 보러 온 자리라 영상은 포스터가 있어도 원본을 재생한다.
              item.type === 'VIDEO' ? (
                // biome-ignore lint/suspicious/noArrayIndexKey: 고정 순서 목록
                <VideoPlayer key={index} src={item.url} className={FRAME_CLASS} />
              ) : (
                // biome-ignore lint/suspicious/noArrayIndexKey: 고정 순서 목록
                <Media key={index} src={item.url} className={FRAME_CLASS} />
              ),
            )}
          </Carousel>
        ) : null}

        <div className="flex flex-col gap-2 px-4 py-4">
          <h1 className="text-h1 font-semibold text-gray-100">{title}</h1>
          {/* 원문 줄바꿈을 그대로 살린다 — 해시태그 줄이 붙어버리면 읽기 어렵다. */}
          {post.caption ? (
            <p className="whitespace-pre-wrap text-b2 text-gray-90">{post.caption}</p>
          ) : null}
          {post.originalUrl ? (
            <OriginalPostLink label={post.authorHandle} href={post.originalUrl} className="mt-2" />
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export { SavedPostPreview };
