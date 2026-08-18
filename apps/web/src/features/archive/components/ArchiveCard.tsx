import { cn } from '@/shared/lib/utils';
import { Badge, COLOR_BG_CLASS, Thumbnail } from '@/shared/ui';
import type { Archive } from '../types';

/** 시안이 한 줄에 98px 썸네일 3개를 놓는다. 넘치는 수는 마지막 칸에 +N 으로 접는다. */
const VISIBLE_THUMBNAILS = 3;

/**
 * Figma `List/Home_Archive > Property 1=Default | Empty`.
 * 홈에서 아카이브 하나를 요약해 보여주는 카드 — 색 스와치 + 이름 + 개수 배지 + 썸네일 줄.
 *
 * Empty 는 별도 prop 이 아니라 `thumbnails` 가 비었을 때 파생된다.
 */
export interface ArchiveCardProps {
  archive: Archive;
  onClick?: () => void;
  className?: string;
}

function ArchiveCard({ archive, onClick, className }: ArchiveCardProps) {
  const thumbnails = archive.thumbnails ?? [];
  const visible = thumbnails.slice(0, VISIBLE_THUMBNAILS);
  // 마지막 칸에 접어 넣을 나머지 게시물 수 (시안의 `Thumbnail/98_Archive > Plus`).
  // 서버는 썸네일을 몇 장만 내려주므로 URL 개수가 아니라 전체 개수에서 뺀다.
  const overflow = archive.placeCount - VISIBLE_THUMBNAILS;

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
          <span
            className={cn('size-2 shrink-0', COLOR_BG_CLASS[archive.color])}
            aria-hidden="true"
          />
          <span className="truncate text-b2 font-medium text-gray-100">{archive.name}</span>
        </span>
        <Badge variant="number">{archive.placeCount}</Badge>
      </div>

      {archive.accessType === 'SHARED' && archive.owner ? (
        <span className="flex items-center gap-1 font-mono text-e2 text-gray-60">
          {archive.owner.profileImageUrl ? (
            <img
              src={archive.owner.profileImageUrl}
              alt=""
              className="size-4 shrink-0 rounded-full object-cover"
            />
          ) : null}
          by {archive.owner.nickname}
        </span>
      ) : null}

      {/* 썸네일은 카드 폭을 3등분해 늘어난다 — 화면이 넓어져도 왼쪽에 몰리지 않게.
          장수가 3보다 적어도 칸 크기는 그대로라 카드끼리 줄이 맞는다. */}
      <div className="grid w-full grid-cols-3 gap-2">
        {visible.length > 0 ? (
          visible.map((src, index) => (
            <Thumbnail
              size="fluid"
              // URL 은 중복될 수 있고 이 목록은 재정렬되지 않으므로 위치를 key 로 쓴다.
              // biome-ignore lint/suspicious/noArrayIndexKey: 고정 순서 목록
              key={index}
              src={src}
              alt=""
              // 실제로 그려진 마지막 칸에만 나머지 수를 얹는다.
              overflowCount={overflow > 0 && index === visible.length - 1 ? overflow : undefined}
            />
          ))
        ) : (
          <Thumbnail size="fluid" />
        )}
      </div>
    </Comp>
  );
}

export { ArchiveCard };
