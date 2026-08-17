import { type CSSProperties, type ReactNode, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/shared/lib/utils';

interface PinnedHeaderLayoutProps {
  /** 상단에 고정할 영역. 보통 `<Header />` 하나지만, 아카이브 상세처럼 정보 블록까지 함께 붙기도 한다. */
  header: ReactNode;
  children: ReactNode;
  /** 고정 영역 배경 — 콘텐츠가 그 아래로 지나가므로 페이지 배경과 같아야 한다. */
  background?: 'white' | 'gray';
  /** 콘텐츠 래퍼에 더할 스타일. 하단 여백처럼 화면마다 다른 값만 넘긴다. */
  contentStyle?: CSSProperties;
  className?: string;
}

/**
 * 헤더는 화면에 고정하고 콘텐츠만 스크롤되는 화면(아카이브 상세·게시물 상세·최상위 탭)의 공용 레이아웃.
 *
 * 콘텐츠는 문서 흐름 그대로 `#root` 스크롤에 맡긴다(global.css — 러버밴드가 거기서만 난다).
 * 고정 영역은 body 로 포탈해 뷰포트 기준 fixed 로 띄운다. 셸의 `will-change-transform` 이
 * fixed 의 기준 박스를 셸로 바꿔서, 포탈 없이는 문서가 스크롤될 때 헤더가 같이 밀려 올라간다
 * (BottomMenu·토스트를 포탈하는 이유와 같다).
 *
 * 고정 영역 높이는 화면마다(그리고 아카이브 이름 줄수처럼 데이터마다) 달라서 실측해 콘텐츠
 * 시작 위치로 넘긴다 — `useLayoutEffect` 라 첫 페인트 전에 잡히고, 이후 변화는
 * ResizeObserver 가 따라간다.
 *
 * +1px: 콘텐츠가 뷰포트보다 짧으면 스크롤이 없어 러버밴드도 안 난다 —
 * iOS 네이티브(alwaysBounceVertical)처럼 짧은 화면도 당겨지도록 최소 스크롤을 만든다.
 */
export function PinnedHeaderLayout({
  header,
  children,
  background = 'white',
  contentStyle,
  className,
}: PinnedHeaderLayoutProps) {
  const backgroundClass = background === 'gray' ? 'bg-gray-10' : 'bg-gray-0';

  const pinnedRef = useRef<HTMLDivElement>(null);
  const [pinnedHeight, setPinnedHeight] = useState(0);

  // 데이터가 늦게 도착해 헤더가 길어지는 경우(아카이브 상세의 작성자 줄)는 렌더마다 다시 재서
  // 첫 페인트 전에 맞춘다. 같은 값이면 React 가 리렌더 없이 넘긴다.
  useLayoutEffect(() => {
    if (pinnedRef.current) setPinnedHeight(pinnedRef.current.offsetHeight);
  });

  // 폰트 로드처럼 렌더 밖에서 생기는 높이 변화는 관찰로 따라간다.
  useLayoutEffect(() => {
    const pinned = pinnedRef.current;
    if (!pinned) return;

    const observer = new ResizeObserver(() => setPinnedHeight(pinned.offsetHeight));
    observer.observe(pinned);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={cn('min-h-[calc(100dvh+1px)] w-full', backgroundClass, className)}>
      {createPortal(
        <div ref={pinnedRef} className="fixed inset-x-0 top-0 z-40">
          {/* 포탈 뒤 fixed 기준은 뷰포트 전체 폭이라, 데스크톱에서도 셸 폭(providers.tsx)을
              넘지 않게 안쪽에서 다시 묶는다. 노치와 겹치지 않도록 safe area 만큼 내린다. */}
          <div
            className={cn('mx-auto w-full max-w-[450px]', backgroundClass)}
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
          >
            {header}
          </div>
        </div>,
        document.body,
      )}

      <div style={{ paddingTop: pinnedHeight, ...contentStyle }}>{children}</div>
    </div>
  );
}
