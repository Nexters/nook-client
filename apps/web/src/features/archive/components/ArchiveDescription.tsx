import { useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/shared/lib/utils';

/**
 * 시안 378:15762 / 378:15815 — 아카이브 상세의 소개글.
 *
 * 접힌 상태는 렌더링된 줄 수 기준 3줄이고, 넘칠 때만 3줄 끝에 `더보기` 를 덮어 얹는다.
 * 넘침은 줄바꿈·화면 너비에 따라 달라서 글자 수가 아니라 실제 높이로 판단하고, 너비가
 * 바뀌면(회전 등) 다시 잰다. 펼치면 본문 아래 `접기` 로 다시 3줄로 줄인다.
 *
 * `post/ExpandableCaption` 은 넘침과 상관없이 늘 더보기를 띄우고 버튼도 본문 아래라 따로 둔다.
 */
export function ArchiveDescription({
  description,
  className,
}: {
  description: string;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const bodyRef = useRef<HTMLParagraphElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: 3줄로 잘린 높이는 그대로라 ResizeObserver 가 못 잡는 본문 교체도 다시 잰다.
  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body || expanded) return;

    const measure = () => setOverflowing(body.scrollHeight > body.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(body);
    return () => observer.disconnect();
  }, [expanded, description]);

  return (
    <div className={cn('flex flex-col items-start', className)}>
      <div className="relative w-full">
        <p
          ref={bodyRef}
          className={cn(
            'whitespace-pre-wrap break-words text-b2 font-normal text-gray-90',
            !expanded && 'line-clamp-3',
          )}
        >
          {description}
        </p>
        {overflowing && !expanded ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            // 시안처럼 말줄임표 없이 3줄 끝을 덮는다(line-clamp 의 `…` 도 이 바탕에 가려진다).
            className="absolute right-0 bottom-0 bg-gray-0 pl-2 text-b3 font-semibold text-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100"
          >
            더보기
          </button>
        ) : null}
      </div>
      {expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-b3 font-semibold text-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100"
        >
          접기
        </button>
      ) : null}
    </div>
  );
}
