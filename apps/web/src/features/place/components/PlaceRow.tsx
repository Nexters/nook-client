import { useRef } from 'react';
import { Icon20Delete, Icon32MappinOff, Icon32MappinOn } from '@/shared/icons/NookIcons';
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
  /**
   * 넘기면 행을 왼쪽으로 밀어 삭제 버튼을 꺼낼 수 있다(Figma `장소 삭제`).
   * 실제 삭제는 여기서 하지 않는다 — 확인 모달을 띄우는 건 사용처 책임이다.
   */
  onDelete?: () => void;
  className?: string;
}

function PlaceRow({
  place,
  bookmarked = false,
  onBookmarkedChange,
  onClick,
  onDelete,
  className,
}: PlaceRowProps) {
  const Body = onClick ? 'button' : 'div';
  const swipeRef = useRef<HTMLDivElement>(null);

  const row = (
    <div className={cn('flex w-full items-center gap-4 bg-gray-0', !onDelete && className)}>
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

  if (!onDelete) return row;

  /*
   * 스와이프는 제스처 핸들러가 아니라 가로 스크롤 스냅으로 만든다 — 관성·되돌아감·
   * 접근성(버튼이 항상 DOM 에 있어 키보드/보이스오버로 닿는다)을 브라우저에 맡기는 쪽이
   * 시트(vaul) 안에서도 안전하다. 같은 이유로 `Carousel` 도 스크롤 스냅을 쓴다.
   */
  return (
    <div
      ref={swipeRef}
      className={cn(
        'flex snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain',
        '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      <div className="w-full shrink-0 snap-start">{row}</div>
      <button
        type="button"
        aria-label={`${place.name} 삭제`}
        onClick={() => {
          // 확인 모달 뒤로 열린 행이 남지 않게 먼저 닫는다(취소해도 원래 자리로 돌아온다).
          swipeRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
          onDelete();
        }}
        className="flex size-16 shrink-0 snap-start flex-col items-center justify-center gap-0.5 rounded-lg bg-error"
      >
        <Icon20Delete />
        <span className="text-b3 font-medium text-gray-0">삭제</span>
      </button>
    </div>
  );
}

export { PlaceRow };
