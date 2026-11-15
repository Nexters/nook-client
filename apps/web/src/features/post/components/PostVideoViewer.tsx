import type { KeyboardEvent, PointerEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Icon24Close, Icon24Play } from '@/shared/icons/NookIcons';
import { playInlineVideo } from '@/shared/lib/inlineVideo';
import { VolumeIcon } from '@/shared/ui/video-player';

/** 게시물 상세 위에 포탈로 띄우는 커스텀 전체화면 동영상 뷰어. */
export interface PostVideoViewerProps {
  src: string;
  onClose: () => void;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  const remaining = String(whole % 60).padStart(2, '0');
  return `${minutes}:${remaining}`;
}

function PostVideoViewer({ src, onClose }: PostVideoViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [scrubTime, setScrubTime] = useState<number | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || video.getAttribute('src') !== src) return;
    const inlineVideo = document.querySelector<HTMLVideoElement>(
      '[data-slot="video-player"] video',
    );
    const startingTime = inlineVideo && !inlineVideo.ended ? inlineVideo.currentTime : 0;
    const startingMuted = inlineVideo?.muted ?? true;
    inlineVideo?.pause();
    setMuted(startingMuted);
    setCurrentTime(startingTime);
    setDuration(0);
    const seekToStart = () => {
      if (startingTime > 0)
        video.currentTime = Math.min(startingTime, video.duration || startingTime);
    };
    video.addEventListener('loadedmetadata', seekToStart);
    if (video.readyState >= 1) seekToStart();
    void playInlineVideo(video, startingMuted).then((started) => {
      if (!started) setPlaying(false);
    });
    return () => {
      const shouldResume = !video.paused && !video.ended;
      video.pause();
      video.removeEventListener('loadedmetadata', seekToStart);
      if (inlineVideo?.isConnected) {
        inlineVideo.currentTime = video.currentTime;
        inlineVideo.muted = video.muted;
        if (shouldResume) void playInlineVideo(inlineVideo, video.muted);
      }
    };
  }, [src]);

  // 본 영상은 손을 놓을 때만 이동한다. 드래그 중 미리보기용 영상만 해당 시각으로 탐색한다.
  useEffect(() => {
    const preview = previewRef.current;
    if (scrubTime === null || !preview || preview.readyState < 1) return;
    preview.currentTime = scrubTime;
  }, [scrubTime]);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused || video.ended) {
      if (video.ended) video.currentTime = 0;
      void playInlineVideo(video, video.muted);
    } else {
      video.pause();
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  const timeAtPointer = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width <= 0 || duration <= 0) return 0;
    return Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)) * duration;
  };

  const startScrub = (event: PointerEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    videoRef.current?.pause();
    setScrubTime(timeAtPointer(event));
  };

  const finishScrub = (event: PointerEvent<HTMLDivElement>) => {
    if (scrubTime === null) return;
    const nextTime = timeAtPointer(event);
    const video = videoRef.current;
    if (video) {
      video.currentTime = nextTime;
      setCurrentTime(nextTime);
      void playInlineVideo(video, video.muted);
    }
    setScrubTime(null);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const seekWithKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || duration <= 0) return;
    let nextTime: number;
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        nextTime = currentTime - 5;
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        nextTime = currentTime + 5;
        break;
      case 'Home':
        nextTime = 0;
        break;
      case 'End':
        nextTime = duration;
        break;
      default:
        return;
    }
    event.preventDefault();
    video.currentTime = Math.max(0, Math.min(duration, nextTime));
    setCurrentTime(video.currentTime);
  };

  const shownTime = scrubTime ?? currentTime;
  const progress = duration > 0 ? Math.max(0, Math.min(1, shownTime / duration)) : 0;

  return (
    <div className="fixed inset-0 z-[70] bg-black">
      <div className="relative mx-auto h-full w-full max-w-[450px] overflow-hidden bg-black">
        <video
          ref={videoRef}
          src={src}
          playsInline
          webkit-playsinline=""
          muted={muted}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
          onTimeUpdate={(event) => {
            if (scrubTime === null) setCurrentTime(event.currentTarget.currentTime);
          }}
          className="size-full object-cover"
        />

        <button
          type="button"
          aria-label={playing ? '일시정지' : '재생'}
          onClick={togglePlayback}
          className="absolute inset-0 z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-0"
        />
        {!playing ? (
          <span
            data-slot="video-viewer-play-icon"
            aria-hidden="true"
            className="-translate-x-1/2 -translate-y-1/2 pointer-events-none absolute top-1/2 left-1/2 z-20 flex size-15 items-center justify-center rounded-full bg-black/45"
          >
            <Icon24Play />
          </span>
        ) : null}

        <button
          type="button"
          aria-label="확대 화면 닫기"
          onClick={onClose}
          className="absolute top-[calc(env(safe-area-inset-top)+20px)] right-5 z-30 flex size-10 items-center justify-center"
        >
          <Icon24Close className="[&_path]:stroke-gray-0" />
        </button>

        <div className="absolute right-6 bottom-[calc(env(safe-area-inset-bottom)+30px)] left-6 z-30 text-gray-0">
          <div className="font-sans text-b2 font-semibold">
            {formatTime(shownTime)} / {formatTime(duration)}
          </div>
          <div className="flex items-center gap-4">
            <div
              data-slot="video-seek-bar"
              role="slider"
              aria-label="동영상 재생 위치"
              aria-valuemin={0}
              aria-valuemax={Math.floor(duration)}
              aria-valuenow={Math.floor(shownTime)}
              aria-valuetext={`${formatTime(shownTime)} / ${formatTime(duration)}`}
              tabIndex={0}
              onKeyDown={seekWithKeyboard}
              onPointerDown={startScrub}
              onPointerMove={(event) => {
                if (scrubTime !== null) setScrubTime(timeAtPointer(event));
              }}
              onPointerUp={finishScrub}
              onPointerCancel={finishScrub}
              className="relative flex h-8 min-w-0 flex-1 cursor-pointer touch-none items-center select-none"
            >
              <div className="absolute inset-x-0 top-3 h-1.5 rounded-full bg-[#777777]/90">
                <div
                  data-slot="video-progress"
                  className="h-full rounded-full bg-gray-0"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              {scrubTime !== null ? (
                <>
                  <div
                    className="-translate-x-1/2 -translate-y-1/2 pointer-events-none absolute top-[15px] size-3 rounded-full bg-gray-0"
                    style={{ left: `${progress * 100}%` }}
                  />
                  <div
                    className="-translate-x-1/2 pointer-events-none absolute bottom-8 h-[107px] w-[60px] overflow-hidden rounded-lg border border-gray-0 bg-black"
                    style={{ left: `clamp(30px, ${progress * 100}%, calc(100% - 30px))` }}
                  >
                    <video
                      ref={previewRef}
                      src={src}
                      muted
                      playsInline
                      preload="auto"
                      onLoadedMetadata={(event) => {
                        event.currentTarget.currentTime = scrubTime;
                      }}
                      className="size-full object-cover"
                    />
                  </div>
                </>
              ) : null}
            </div>
            <button
              type="button"
              aria-label={muted ? '소리 켜기' : '소리 끄기'}
              aria-pressed={!muted}
              onClick={toggleMute}
              className="flex size-8 shrink-0 items-center justify-center"
            >
              <VolumeIcon muted={muted} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { PostVideoViewer };
