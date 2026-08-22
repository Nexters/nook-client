import { isVideoUrl } from '@/shared/lib/media';

/**
 * 이미지/영상을 URL 하나로 받아 그리는 표현 컴포넌트.
 *
 * 게시물 미디어에는 영상이 섞여 들어오는데(`SavedPostMediaResponse.type = VIDEO`)
 * `<img>` 로만 그리면 깨진 이미지가 된다. 어떤 태그로 그릴지는 사용처가 아니라
 * 여기서 정한다 — 썸네일·캐러셀·확대 보기가 모두 같은 판단을 쓰게.
 *
 * `controls` 를 켜지 않으면 영상은 첫 프레임만 보여준다(썸네일). iOS WKWebView 는
 * `preload="metadata"` 만으로 첫 프레임을 그리지 않는 경우가 있어 `#t=0.001` 로
 * 시작 지점을 지정한다.
 */
export interface MediaProps {
  src?: string;
  /** 이미지일 때의 대체 텍스트. 장식용이면 비워둔다. */
  alt?: string;
  /** 영상일 때 재생 컨트롤을 노출한다. 끄면 첫 프레임만 보여주는 썸네일이 된다. */
  controls?: boolean;
  className?: string;
}

function Media({ src, alt = '', controls = false, className }: MediaProps) {
  if (src && isVideoUrl(src)) {
    return (
      <video
        data-slot="media-video"
        src={controls ? src : `${src}#t=0.001`}
        className={className}
        controls={controls}
        preload="metadata"
        playsInline
        muted={!controls}
      />
    );
  }

  return <img data-slot="media-image" src={src} alt={alt} className={className} />;
}

export { Media };
