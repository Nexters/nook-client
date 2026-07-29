import { cn } from '@/shared/lib/utils';
import { Badge, COLOR_BG_CLASS, Thumbnail } from '@/shared/ui';
import type { Group } from '../types';

/** 시안이 한 줄에 98px 썸네일 3개를 놓는다. 넘치는 수는 마지막 칸에 +N 으로 접는다. */
const VISIBLE_THUMBNAILS = 3;

/**
 * Figma `List/Home_Group > Property 1=Default | Empty`.
 * 홈에서 그룹 하나를 요약해 보여주는 카드 — 색 스와치 + 이름 + 개수 배지 + 썸네일 줄.
 *
 * Empty 는 별도 prop 이 아니라 `thumbnails` 가 비었을 때 파생된다.
 */
export interface GroupCardProps {
  group: Group;
  onClick?: () => void;
  className?: string;
}

function GroupCard({ group, onClick, className }: GroupCardProps) {
  const thumbnails = group.thumbnails ?? [];
  const visible = thumbnails.slice(0, VISIBLE_THUMBNAILS);
  // 마지막 칸에 접어 넣을 나머지 장수 (시안의 `Thumbnail/98_Group > Plus`)
  const overflow = thumbnails.length - VISIBLE_THUMBNAILS;

  const Comp = onClick ? 'button' : 'div';

  return (
    <Comp
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={cn(
        'flex w-full flex-col items-start gap-2 overflow-hidden rounded-sm bg-gray-0 p-4 text-left',
        onClick &&
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100 focus-visible:ring-inset',
        className,
      )}
    >
      <div className="flex w-full items-center gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <span className={cn('size-2 shrink-0', COLOR_BG_CLASS[group.color])} aria-hidden="true" />
          <span className="truncate text-b2 font-medium text-gray-100">{group.name}</span>
        </span>
        <Badge variant="number">{group.placeCount}</Badge>
      </div>

      {visible.length > 0 ? (
        <div className="flex items-center gap-2">
          {visible.map((src, index) => (
            <Thumbnail
              // URL 은 중복될 수 있고 이 목록은 재정렬되지 않으므로 위치를 key 로 쓴다.
              // biome-ignore lint/suspicious/noArrayIndexKey: 고정 순서 목록
              key={index}
              src={src}
              alt=""
              // 마지막 칸에만 나머지 장수를 얹는다.
              overflowCount={
                overflow > 0 && index === VISIBLE_THUMBNAILS - 1 ? overflow : undefined
              }
            />
          ))}
        </div>
      ) : (
        // 빈 그룹은 시안 `Thumbnail/98_Group > Empty` — 60_Thumbnail 도형이다.
        // size="sm" 이 그 애셋을 고르고, 박스 크기만 98px 로 덮는다.
        <Thumbnail size="sm" className="size-[98px]" />
      )}
    </Comp>
  );
}

export { GroupCard };
