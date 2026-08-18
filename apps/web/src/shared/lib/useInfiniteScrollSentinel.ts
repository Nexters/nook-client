import { useEffect, useRef } from 'react';

/**
 * 목록 끝(sentinel)이 화면에 들어오면 다음 페이지를 당기는 무한 스크롤 훅.
 *
 * `useInfiniteQuery` 결과를 그대로 넘기고, 돌려받은 ref 를 목록 맨 아래 빈 div 에 단다.
 * 마지막 페이지면 관찰 대상을 잡지 않아 아무 일도 하지 않는다.
 */
export function useInfiniteScrollSentinel({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) fetchNextPage();
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return sentinelRef;
}
