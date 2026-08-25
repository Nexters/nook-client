import * as React from 'react';
import { Icon16Expand, Icon24Pause, Icon24Play } from '@/shared/icons/NookIcons';
import { playInlineVideo } from '@/shared/lib/inlineVideo';
import { cn } from '@/shared/lib/utils';

/**
 * Figma `8월 21일 작업 > 릴스 상세`(177:23568).
 *
 * 영상을 재생하는 자리 전용 컴포넌트. 네이티브 `controls` 대신 시안의 컨트롤을 직접 그린다 —
 * 시안은 가운데 재생/일시정지 하나와 우하단 확대뿐이라 브라우저 기본 컨트롤 바와 모양이 다르다.
 *
 * 썸네일 자리(첫 프레임만 보여주는 곳)는 여전히 `Media` 가 맡는다. 여기는 "재생시키는 자리"다.
 *
 * 자동재생은 `muted` 없이는 어느 브라우저에서도 시작되지 않는다(사용자 제스처 정책). 시안의
 * 기본 상태가 재생 중(⏸)이라 muted 로 걸어 둔다 — 소리는 확대뷰에서 켠다.
 *
 * 크기·비율은 사용처가 `className` 으로 준다. 프리미티브는 표면과 컨트롤만 소유한다.
 */
/** 재생 중 컨트롤이 저절로 사라지기까지의 시간. 시안에 보임/숨김 상태가 쌍으로 있다. */
const AUTO_HIDE_MS = 2000;

export interface VideoPlayerProps {
  src: string;
  /** 넘기면 우하단에 확대 버튼이 붙는다. 없으면 그리지 않는다. */
  onExpand?: () => void;
  /** 소리를 켜고 시작한다. 자동재생은 muted 일 때만 시작되므로 확대뷰처럼 탭을 거친 화면에서만 쓴다. */
  unmuted?: boolean;
  className?: string;
}

function VideoPlayer({ src, onExpand, unmuted = false, className }: VideoPlayerProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  // 실제 play 이벤트가 오기 전에는 재생 중으로 간주하지 않는다.
  const [playing, setPlaying] = React.useState(false);
  const [controlsVisible, setControlsVisible] = React.useState(true);

  // 선언형 autoPlay 대신 인라인 속성과 muted를 먼저 확정한 뒤 재생한다. iOS가 인라인 재생을
  // 지원하지 않으면 play()를 호출하지 않아 네이티브 전체화면 플레이어로 넘어가지 않는다.
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video || video.getAttribute('src') !== src) return;
    void playInlineVideo(video, !unmuted).then((started) => {
      if (!started) setPlaying(false);
    });
  }, [src, unmuted]);

  // 재생 중일 때만 컨트롤을 숨긴다 — 멈춰 있는데 재생 버튼까지 사라지면 되돌릴 방법이 없다.
  React.useEffect(() => {
    if (!playing || !controlsVisible) return;
    const timer = setTimeout(() => setControlsVisible(false), AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [playing, controlsVisible]);

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    setControlsVisible(true);
    if (video.paused) void playInlineVideo(video, !unmuted);
    else video.pause();
  };

  return (
    <div data-slot="video-player" className={cn('relative overflow-hidden', className)}>
      {/* 영상 어디를 눌러도 재생/일시정지가 되고, 숨은 컨트롤도 이걸로 되살아난다.
          가운데 원형은 이 버튼의 표시일 뿐이라 여기 하나만 진짜 버튼으로 둔다 —
          같은 이름의 버튼이 둘이면 스크린리더에 똑같은 항목이 두 번 읽힌다.
          탭 순서상 이게 먼저라, 포커스가 닿을 때 컨트롤을 되살리면 다음 탭에서
          확대 버튼이 보이는 상태로 이어진다. */}
      <button
        type="button"
        aria-label={playing ? '일시정지' : '재생'}
        onClick={toggle}
        onFocus={() => setControlsVisible(true)}
        className="absolute inset-0 z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-0"
      />
      <video
        ref={videoRef}
        src={src}
        loop
        playsInline
        webkit-playsinline=""
        muted={!unmuted}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        className="size-full object-cover"
      />

      <div
        // 숨을 때 클릭까지 사라져야 한다 — 안 그러면 안 보이는 확대 버튼이 계속 눌린다.
        className={cn(
          'absolute inset-0 z-30 transition-opacity duration-200',
          controlsVisible ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        {/* 재생 상태 표시. 누르는 건 아래 깔린 전체 버튼이 받게 클릭을 통과시킨다. */}
        <span
          aria-hidden="true"
          className="-translate-x-1/2 -translate-y-1/2 pointer-events-none absolute top-1/2 left-1/2 flex size-15 items-center justify-center rounded-full bg-gray-100/80"
        >
          {playing ? <Icon24Pause /> : <Icon24Play />}
        </span>

        {onExpand ? (
          // 시안의 프레임 안쪽 여백 11px — 가장 가까운 토큰인 3(12px)으로 맞춘다.
          <button
            type="button"
            aria-label="영상 크게 보기"
            aria-hidden={!controlsVisible}
            tabIndex={controlsVisible ? undefined : -1}
            onClick={onExpand}
            className="absolute right-3 bottom-3 flex size-7 items-center justify-center rounded-full bg-gray-100/50"
          >
            <Icon16Expand />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export { VideoPlayer };
