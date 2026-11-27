import { useId, useLayoutEffect, useRef, useState } from 'react';
import { Icon16ArrowDown } from '@/shared/icons/NookIcons';
import { cn } from '@/shared/lib/utils';
import { Badge } from '@/shared/ui';

/** Drawer 태그는 한 줄로 시작하고 사용자가 펼칠 때만 전체를 표시한다. */
export function PlaceTags({ tags }: { tags: string[] }) {
  const id = useId();
  const content = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useLayoutEffect(() => {
    const node = content.current;
    if (!node) return;
    const measure = () => setOverflow(node.scrollHeight > 24);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex min-h-10 items-start gap-1.5 py-2">
      <div id={id} className={cn('min-w-0 flex-1 overflow-hidden', !expanded && 'max-h-6')}>
        <div ref={content} className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Badge key={tag} variant="label">
              {tag}
            </Badge>
          ))}
        </div>
      </div>
      <div className="w-6 shrink-0">
        {overflow ? (
          <button
            type="button"
            aria-label={expanded ? '태그 접기' : '태그 펼치기'}
            aria-expanded={expanded}
            aria-controls={id}
            onClick={() => setExpanded((value) => !value)}
            className="flex size-6 items-center justify-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100"
          >
            <Icon16ArrowDown className={expanded ? 'rotate-180' : undefined} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
