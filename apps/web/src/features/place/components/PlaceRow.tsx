import { Icon32MappinOff, Icon32MappinOn } from '@/shared/icons/NookIcons';
import { cn } from '@/shared/lib/utils';
import { Thumbnail } from '@/shared/ui';
import type { Place } from '../types';

/**
 * Figma `List/64_Place > Property 1=Default | Image_x`(126:3352).
 * 검색·목록에서 장소 한 건을 보여주는 행 — 64px 썸네일 + `이름 업종` / `주소 · 거리` 두 줄
 * + 저장 토글(핀).
 *
 * `Image_x` 는 별도 prop 이 아니라 `place.thumbnail` 이 없을 때 파생된다.
 * 행 본문과 저장 토글은 별개의 액션이라 토글을 행 버튼 안에 중첩하지 않고 형제로 둔다.
 */
export interface PlaceRowProps {
  place: Place;
  bookmarked?: boolean;
  onBookmarkedChange?: (bookmarked: boolean) => void;
  onClick?: () => void;
  className?: string;
}

function PlaceRow({
  place,
  bookmarked = false,
  onBookmarkedChange,
  onClick,
  className,
}: PlaceRowProps) {
  const Body = onClick ? 'button' : 'div';

  return (
    <div className={cn('flex w-full items-center gap-4 bg-gray-0', className)}>
      <Body
        {...(onClick ? { type: 'button' as const, onClick } : {})}
        className={cn(
          'flex min-w-0 flex-1 items-center gap-4 text-left',
          onClick &&
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100 focus-visible:ring-inset',
        )}
      >
        <Thumbnail size="sm" src={place.thumbnail} alt="" />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex min-w-0 items-end gap-1">
            <span className="truncate text-b2 font-semibold text-gray-90">{place.name}</span>
            <span className="shrink-0 text-b3 font-medium text-gray-70">{place.category}</span>
          </span>
          <span className="flex min-w-0 items-center gap-1">
            <span className="truncate text-b3 font-medium text-gray-80">{place.address}</span>
            {place.distance ? (
              <>
                <span className="size-0.5 shrink-0 rounded-full bg-gray-80" aria-hidden="true" />
                <span className="shrink-0 text-b3 font-medium text-gray-80">{place.distance}</span>
              </>
            ) : null}
          </span>
        </span>
      </Body>

      {onBookmarkedChange ? (
        <button
          type="button"
          onClick={() => onBookmarkedChange(!bookmarked)}
          aria-pressed={bookmarked}
          aria-label={`${place.name} 즐겨찾기`}
          className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100 focus-visible:ring-offset-2"
        >
          {bookmarked ? <Icon32MappinOn /> : <Icon32MappinOff />}
        </button>
      ) : null}
    </div>
  );
}

export { PlaceRow };
