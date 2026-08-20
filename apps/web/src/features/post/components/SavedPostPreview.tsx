import { createPortal } from 'react-dom';
import { Icon24Back } from '@/shared/icons/NookIcons';
import { Carousel, Header } from '@/shared/ui';
import type { Post } from '../types';
import { ExpandableCaption } from './ExpandableCaption';
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
 */
export interface SavedPostPreviewProps {
  title: string;
  post: Post;
  /** 처음 보여줄 사진 위치 — 카드에서 누른 그 사진부터 연다. */
  initialIndex?: number;
  onClose: () => void;
}

function SavedPostPreview({ title, post, initialIndex = 0, onClose }: SavedPostPreviewProps) {
  const images = post.images ?? [];

  return createPortal(
    // z-70: 전체화면 오버레이라 탭바(60)까지 덮는다.
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-gray-0"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <Header
        left={
          <button type="button" onClick={onClose} aria-label="게시물 미리보기 닫기">
            <Icon24Back />
          </button>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {images.length > 0 ? (
          <Carousel padded={false} gap={0} initialIndex={initialIndex}>
            {images.map((src, index) => (
              // 이미지 URL 은 중복될 수 있고 순서가 고정이라 위치를 key 로 쓴다.
              // biome-ignore lint/suspicious/noArrayIndexKey: 고정 순서 목록
              <img key={index} src={src} alt="" className="aspect-[375/469] w-full object-cover" />
            ))}
          </Carousel>
        ) : null}

        <div className="flex flex-col gap-2 px-4 py-4">
          <h1 className="text-h1 font-semibold text-gray-100">{title}</h1>
          {post.caption ? <ExpandableCaption caption={post.caption} lines={2} /> : null}
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
