import {
  type CSSProperties,
  createContext,
  type ReactNode,
  type RefObject,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/shared/lib/utils';

/**
 * 실측한 고정 영역 높이. 콘텐츠가 그 뒤로 숨었는지 판정하려면 이 값이 필요한데, 재는
 * 주체가 레이아웃이라 컨텍스트로 내린다 — 헤더로 넘긴 노드도 이 트리 안에서 렌더되므로
 * (포탈은 DOM 위치만 바꾼다) 헤더 안에서도 그대로 읽힌다.
 */
const PinnedHeightContext = createContext(0);

/** 실측한 고정 영역 높이를 콘텐츠 쪽 CSS 에도 흘려준다 — 아래 `PINNED_HEADER_STICKY` 용. */
const PINNED_HEADER_HEIGHT_VAR = '--pinned-header-height';

/**
 * 콘텐츠 안에 있으면서 고정 헤더 바로 아래에 붙어 서는 줄(아카이브 상세의 게시물/장소 탭).
 *
 * 헤더처럼 처음부터 고정해 버리면 그 위에 있어야 할 아카이브 이름보다 먼저 그려진다 —
 * 순서는 문서 흐름대로 두고, 스크롤이 헤더 밑까지 올라왔을 때만 멈춰 세운다. 뒤로 콘텐츠가
 * 지나가므로 배경은 사용처가 페이지 배경과 같게 준다.
 */
// Tailwind 는 소스를 정적으로 훑어 클래스를 만든다 — 변수명을 끼워 넣어 조립하면
// 그 클래스가 소스에 없는 것이 되어 CSS 가 생성되지 않는다. 그래서 통째로 적는다.
export const PINNED_HEADER_STICKY =
  'sticky top-[var(--pinned-header-visible-height,var(--pinned-header-height))] z-30';

/** 이만큼(px) 이상 한 방향으로 움직여야 스크롤 방향이 바뀐 것으로 본다 — 손 떨림 무시. */
const SCROLL_DIRECTION_THRESHOLD_PX = 8;
const HEADER_TRANSITION_MS = 200;

interface PinnedHeaderLayoutProps {
  /** 상단에 고정할 영역. 보통 `<Header />` 하나지만, 아카이브 상세처럼 정보 블록까지 함께 붙기도 한다. */
  header: ReactNode;
  children: ReactNode;
  /** 고정 영역 배경 — 콘텐츠가 그 아래로 지나가므로 페이지 배경과 같아야 한다. */
  background?: 'white' | 'gray';
  /** 콘텐츠 래퍼에 더할 스타일. 하단 여백처럼 화면마다 다른 값만 넘긴다. */
  contentStyle?: CSSProperties;
  /**
   * 넘기면 이 요소가 헤더 뒤로 숨은 뒤부터 아래로 스크롤할 때 헤더를 위로 접고, 위로
   * 스크롤하면 다시 편다(아카이브 상세 시안). 접힌 동안 `PINNED_HEADER_STICKY` 줄은
   * safe area 바로 밑까지 올라와 화면 맨 위에 남는다.
   */
  collapseAfter?: RefObject<HTMLElement | null>;
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
  collapseAfter,
  className,
}: PinnedHeaderLayoutProps) {
  const backgroundClass = background === 'gray' ? 'bg-gray-10' : 'bg-gray-0';

  const pinnedRef = useRef<HTMLDivElement>(null);
  const [pinnedHeight, setPinnedHeight] = useState(0);
  const safeAreaRef = useRef<HTMLDivElement>(null);
  const [safeAreaHeight, setSafeAreaHeight] = useState(0);

  // 데이터가 늦게 도착해 헤더가 길어지는 경우(아카이브 상세의 작성자 줄)는 렌더마다 다시 재서
  // 첫 페인트 전에 맞춘다. 같은 값이면 React 가 리렌더 없이 넘긴다.
  useLayoutEffect(() => {
    if (pinnedRef.current) setPinnedHeight(pinnedRef.current.offsetHeight);
    if (safeAreaRef.current) setSafeAreaHeight(safeAreaRef.current.offsetHeight);
  });

  // 폰트 로드처럼 렌더 밖에서 생기는 높이 변화는 관찰로 따라간다.
  useLayoutEffect(() => {
    const pinned = pinnedRef.current;
    if (!pinned) return;

    const safeArea = collapseAfter ? safeAreaRef.current : null;
    const observer = new ResizeObserver(() => {
      setPinnedHeight(pinned.offsetHeight);
      if (safeArea) setSafeAreaHeight(safeArea.offsetHeight);
    });
    observer.observe(pinned);
    if (safeArea) observer.observe(safeArea);
    return () => observer.disconnect();
  }, [collapseAfter]);

  const headerBodyRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const collapsed = useHeaderScroll(
    collapseAfter,
    headerBodyRef,
    contentRef,
    pinnedHeight,
    safeAreaHeight,
  );

  return (
    <PinnedHeightContext.Provider value={pinnedHeight}>
      <div className={cn('min-h-[calc(100dvh+1px)] w-full', backgroundClass, className)}>
        {createPortal(
          <div
            ref={pinnedRef}
            className={cn('fixed inset-x-0 top-0 z-40', collapsed && 'pointer-events-none')}
          >
            {/* 접힌 헤더가 밀려 올라가는 동안 상태 표시줄 자리를 가린다 — 안 가리면 헤더의
                아랫부분이 노치 옆에 걸쳐 보인다. 펴진 동안엔 헤더 배경과 같아 티가 안 난다. */}
            {collapseAfter ? (
              <div
                ref={safeAreaRef}
                aria-hidden="true"
                className={cn(
                  'absolute inset-x-0 top-0 z-10 mx-auto h-[env(safe-area-inset-top)] max-w-[450px]',
                  backgroundClass,
                )}
              />
            ) : null}
            {/* 포탈 뒤 fixed 기준은 뷰포트 전체 폭이라, 데스크톱에서도 셸 폭(providers.tsx)을
              넘지 않게 안쪽에서 다시 묶는다. 노치와 겹치지 않도록 safe area 만큼 내린다. */}
            <div
              ref={headerBodyRef}
              inert={collapsed}
              className={cn('mx-auto w-full max-w-[450px]', backgroundClass)}
              style={{ paddingTop: 'env(safe-area-inset-top)' }}
            >
              {header}
            </div>
          </div>,
          document.body,
        )}

        <div
          ref={contentRef}
          style={
            {
              paddingTop: pinnedHeight,
              [PINNED_HEADER_HEIGHT_VAR]: `${pinnedHeight}px`,
              ...contentStyle,
            } as CSSProperties
          }
        >
          {children}
        </div>
      </div>
    </PinnedHeightContext.Provider>
  );
}

/**
 * 대상의 아래변이 지정된 뷰포트 위치를 지났는지 관찰한다.
 */
function useScrolledBehind(
  target: RefObject<HTMLElement | null> | undefined,
  boundary: number | undefined,
): boolean {
  const [behind, setBehind] = useState(false);

  useEffect(() => {
    const element = target?.current;
    if (!element || boundary === undefined) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries.at(-1);
        if (entry) setBehind(entry.boundingClientRect.bottom <= boundary);
      },
      {
        root: document.getElementById('root'),
        rootMargin: `-${Math.round(boundary)}px 0px 0px 0px`,
      },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [target, boundary]);

  return behind;
}

/**
 * 고정 헤더의 제목 슬롯에 넣는 지연 제목 — `target`(스크롤되어 올라가는 본문의 이름
 * 블록)이 헤더 뒤로 숨은 뒤에야 나타난다.
 *
 * 숨어 있을 때도 자리는 지킨다. 나타날 때 좌우 버튼이 밀리지 않게 하려는 것이고,
 * `Header` 가 제목 유무로 좌우 균형 칸을 넣었다 뺐다 하는 것도 막는다.
 */
export function PinnedHeaderTitle({
  target,
  children,
}: {
  target: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  const pinnedHeight = useContext(PinnedHeightContext);
  const behind = useScrolledBehind(target, pinnedHeight || undefined);

  return (
    <span
      aria-hidden={!behind}
      className={cn(
        'block truncate transition-opacity duration-150 motion-reduce:transition-none',
        behind ? 'opacity-100' : 'opacity-0',
      )}
    >
      {children}
    </span>
  );
}

/** Apply one edge position to the portaled header and sticky tabs in the same frame. */
function useHeaderScroll(
  target: RefObject<HTMLElement | null> | undefined,
  headerRef: RefObject<HTMLDivElement | null>,
  contentRef: RefObject<HTMLDivElement | null>,
  expandedTop: number,
  safeTop: number,
) {
  const [collapsed, setCollapsed] = useState(false);

  useLayoutEffect(() => {
    const root = document.getElementById('root');
    const header = headerRef.current;
    const content = contentRef.current;
    if (!target || !root || !header || !content || expandedTop <= safeTop) return;

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let last = root.scrollTop;
    let down = false;
    let visibleTop = expandedTop;
    let destination = expandedTop;
    const handoffEdge = () =>
      Math.max(
        safeTop,
        Math.min(expandedTop, target.current?.getBoundingClientRect().bottom ?? expandedTop),
      );
    const apply = (top: number, edge: number) => {
      const nextTop = Math.max(top, edge);
      if (nextTop === visibleTop) return;
      visibleTop = nextTop;
      header.style.translate = `0 ${visibleTop - expandedTop}px`;
      content.style.setProperty('--pinned-header-visible-height', `${visibleTop}px`);
    };
    const animateTo = (top: number) => {
      cancelAnimationFrame(frame);
      destination = top;
      const from = visibleTop;
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.max(0, Math.min(1, (now - start) / HEADER_TRANSITION_MS));
        apply(from + (top - from) * (1 - (1 - progress) ** 3), handoffEdge());
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };

    const onScroll = () => {
      const scrollTop = root.scrollTop;
      if (scrollTop < 0 || scrollTop > root.scrollHeight - root.clientHeight) return;
      const delta = scrollTop - last;
      if (Math.abs(delta) >= SCROLL_DIRECTION_THRESHOLD_PX) {
        last = scrollTop;
        down = delta > 0;
      }

      const edge = handoffEdge();
      const next = down ? edge : expandedTop;
      setCollapsed(down && edge <= safeTop);
      if (
        reducedMotion?.matches ||
        (down && edge > safeTop) ||
        (down && destination > safeTop && visibleTop - safeTop <= SCROLL_DIRECTION_THRESHOLD_PX)
      ) {
        cancelAnimationFrame(frame);
        destination = next;
        apply(next, edge);
      } else {
        if (visibleTop < edge) apply(edge, edge);
        if (next !== destination) animateTo(next);
      }
    };

    root.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      root.removeEventListener('scroll', onScroll);
      header.style.removeProperty('translate');
      content.style.removeProperty('--pinned-header-visible-height');
    };
  }, [target, headerRef, contentRef, expandedTop, safeTop]);

  return target !== undefined && collapsed;
}
