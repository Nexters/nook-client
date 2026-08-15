import type * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useBackInterceptor } from '@/shared/lib/backInterceptors';
import { cn } from '@/shared/lib/utils';

/** 슬라이드 시간. 아래 `duration-300` 과 같은 값이어야 한다. */
const SLIDE_DURATION_MS = 300;

interface UseSlideScreenOptions {
  /**
   * 화면이 떠 있는지. 라우트로 분리된 화면은 라우트가 곧 존재 여부라 기본값(true)을 쓰고,
   * 마이페이지 회원 정보처럼 한 라우트 안에서 켜고 끄는 화면만 넘긴다.
   */
  open?: boolean;
  /** 전환이 끝난 뒤 실제로 화면을 닫는 동작. 보통 `navigate(-1)`. */
  close: () => void;
}

/**
 * 오른쪽에서 열리고 오른쪽으로 닫히는 전체화면 전환.
 *
 * 메뉴 행의 화살표가 "옆에서 화면이 열린다"를 예고하므로 진입·복귀를 같은 축으로 맞춘다.
 * 닫기는 전환이 끝난 다음에 히스토리를 되돌려, 화면이 사라진 뒤 잔상이 남지 않게 한다.
 *
 * 뒤로가기 세 경로 중 둘만 여기로 수렴한다 —
 *   좌상단 버튼: `slideOut` 을 직접 연결한다.
 *   Android 하드웨어 백: 인터셉터로 가로채 같은 전환을 태운다.
 *   iOS 엣지 스와이프: WKWebView 가 히스토리를 직접 조작해 웹이 개입할 수 없고,
 *     제스처 자체의 네이티브 전환이 그려진다.
 */
export function useSlideScreen({ open = true, close }: UseSlideScreenOptions) {
  const [slidIn, setSlidIn] = useState(false);
  const closing = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // 첫 페인트는 화면 밖에서 시작해야 전환이 걸리므로 다음 프레임에 올린다.
  useEffect(() => {
    if (!open) {
      setSlidIn(false);
      closing.current = false;
      return undefined;
    }
    const frame = requestAnimationFrame(() => setSlidIn(true));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const slideOut = useCallback(() => {
    // 연타·중복 호출로 히스토리를 두 칸 되돌리지 않는다.
    if (closing.current) return;
    closing.current = true;
    setSlidIn(false);
    closeTimer.current = setTimeout(close, SLIDE_DURATION_MS);
  }, [close]);

  useBackInterceptor(
    useCallback(() => {
      if (!open) return false;
      slideOut();
      return true;
    }, [open, slideOut]),
  );

  return { slidIn, slideOut };
}

export interface SlideScreenProps extends React.HTMLAttributes<HTMLDivElement> {
  /** `useSlideScreen` 이 주는 값. false 면 화면 오른쪽 밖에 있다. */
  slidIn: boolean;
}

/**
 * `useSlideScreen` 과 짝을 이루는 전체화면 컨테이너.
 * 스크롤은 화면마다 구조가 달라 여기서 정하지 않는다 — 사용처가 className 으로 준다.
 */
export function SlideScreen({ slidIn, className, ...props }: SlideScreenProps) {
  return createPortal(
    <div
      data-slot="slide-screen"
      className={cn(
        // 슬라이드 동안 문서가 옆으로 늘어나지 않도록 뷰포트에 고정한다.
        'fixed inset-0 z-40 flex flex-col bg-gray-0',
        'transition-transform duration-300 ease-out motion-reduce:transition-none',
        slidIn ? 'translate-x-0' : 'translate-x-full',
        className,
      )}
      {...props}
    />,
    // 셸의 will-change-transform 이 fixed 의 기준을 셸 박스로 바꾼다 — 문서(#root)가
    // 스크롤되면 전체화면이 함께 밀려나므로 body 로 포탈한다(BottomMenu·토스트와 같은 이유).
    document.body,
  );
}
