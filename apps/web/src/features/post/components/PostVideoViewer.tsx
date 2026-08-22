import { useEffect, useRef, useState } from 'react';
import { Icon24Pause, Icon24Play } from '@/shared/icons/NookIcons';
import { useSwipeDownToDismiss } from '@/shared/lib/useSwipeDownToDismiss';
import { BackButton, Header } from '@/shared/ui';

/**
 * Figma `8월 21일 작업 > 영상 확대뷰`(177:23620).
 *
 * 영상을 화면 폭 꽉 채워 보여주는 전체화면 레이어. 라우트가 아니라 상세 위에 얹는
 * 오버레이라서(뒤로가기 = 닫기) 사용처가 열림 상태를 소유한다 — `PostImageViewer` 와 같다.
 *
 * 이미지 뷰어와 레이아웃이 달라(9:16 프레임 + 하단 진행바, 캐러셀 없음) 파일을 나눴다.
 * 여기서는 소리를 켠다 — 확대뷰는 사용자가 눌러서 들어온 화면이라 자동재생 제약이 없다.
 */
/** 시안의 영상 프레임 — 375x667 = 9:16. */
const FRAME_CLASS = 'aspect-[9/16] w-full object-cover';

export interface PostVideoViewerProps {
  src: string;
  onClose: () => void;
}

function PostVideoViewer({ src, onClose }: PostVideoViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);
  // 진행바가 채워진 비율(0~1). `timeupdate` 는 초당 4회쯤 와서 따로 rAF 를 돌리지 않는다.
  const [progress, setProgress] = useState(0);
  // 헤더 버튼 말고 아래로 쓸어내려서도 닫는다 — 전체화면이라 버튼까지 손이 가기 멀다.
  const swipe = useSwipeDownToDismiss(onClose);

  // 확대뷰로 들어온 순간부터 소리가 나야 한다. muted 로 시작하지 않으므로 자동재생이
  // 막힐 수 있는데, 그때는 멈춘 상태로 재생 버튼을 보여주면 된다(아래 onPause 가 받는다).
  useEffect(() => {
    void videoRef.current?.play();
  }, []);

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  };

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
        {/* 헤더는 영상 위에 얹는다 — 자리를 차지하면 그만큼 영상이 아래로 밀린다. */}
        <div
          className="absolute inset-x-0 top-0 z-10"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <Header variant="transparent" left={<BackButton onClick={onClose} />} />
        </div>
        {/* 영상은 헤더 아래 남은 공간이 아니라 화면 전체를 기준으로 세로 가운데에 온다.
            `PostImageViewer` 와 같은 이유로 가운데 보정(-50%)과 끌어내린 거리를 한 값에 합친다. */}
        <div
          className="absolute inset-x-0 top-1/2"
          style={{
            translate: `0 calc(-50% + ${swipe.offset}px)`,
            transition: swipe.returning ? 'translate 200ms ease-out' : undefined,
          }}
        >
          <div className="relative w-full">
            {/* biome-ignore lint/a11y/useMediaCaption: 외부 게시물 영상이라 자막 트랙이 없다 */}
            <video
              ref={videoRef}
              src={src}
              loop
              playsInline
              preload="metadata"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onTimeUpdate={(event) => {
                const video = event.currentTarget;
                // 길이를 모르는 동안(메타데이터 전·라이브)엔 0 으로 둔다 — NaN 이 width 로 새면
                // 진행바가 통째로 사라진다.
                setProgress(video.duration > 0 ? video.currentTime / video.duration : 0);
              }}
              className={FRAME_CLASS}
            />
            {/* 시안엔 재생/일시정지만 있고 탐색은 없다. 진행바는 표시 전용이라 button 이 아니다. */}
            <button
              type="button"
              aria-label={playing ? '일시정지' : '재생'}
              onClick={toggle}
              className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2 flex size-15 items-center justify-center rounded-full bg-gray-100/80"
            >
              {playing ? <Icon24Pause /> : <Icon24Play />}
            </button>
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gray-100/30">
              <div
                data-slot="video-progress"
                className="h-full bg-gray-0"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { PostVideoViewer };
