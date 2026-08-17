import { useEffect, useRef } from 'react';
import { Icon20Delete, Icon32MappinOff, Icon32MappinOn } from '@/shared/icons/NookIcons';
import { cn } from '@/shared/lib/utils';
import { Thumbnail } from '@/shared/ui';
import type { Place } from '../types';

/** 이만큼 누르고 있으면 밀지 않아도 삭제 버튼이 열린다. */
const LONG_PRESS_MS = 500;
/** 이보다 많이 움직이면 롱프레스가 아니라 미는 제스처로 본다. */
const LONG_PRESS_TOLERANCE_PX = 10;

/**
 * Figma `List/64_Place > Property 1=Default | Image_x`(126:3352).
 * 검색·목록에서 장소 한 건을 보여주는 행 — 64px 썸네일 + `이름 업종` / `주소 · 거리` 두 줄
 * + 저장 토글(핀).
 *
 * `Image_x` 는 별도 prop 이 아니라 `place.thumbnail` 이 없을 때 파생된다.
 * 행 본문과 저장 토글은 별개의 액션이라 토글을 행 버튼 안에 중첩하지 않고 형제로 둔다.
 *
 * 좌우 여백(`px-4`)은 목록이 아니라 행이 소유한다 — 삭제 스와이프에서 여백째 밀려나가야
 * 해서다. 그래서 목록은 화면 폭을 그대로 쓰고(필요하면 `-mx-4` 로 부모 여백을 상쇄한다),
 * 여백은 행마다 붙는다.
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
  const pressTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pressOrigin = useRef<{ x: number; y: number } | null>(null);
  // 롱프레스로 열었으면 손을 뗄 때 따라오는 click(행 본문 이동)을 삼킨다.
  const longPressed = useRef(false);

  useEffect(() => () => clearTimeout(pressTimer.current), []);

  const row = (
    <div className={cn('flex w-full items-center gap-4 bg-gray-0 px-4', !onDelete && className)}>
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
   * 삭제 버튼은 화면 오른쪽 밖에 대기하다가 행이 밀리면서 따라 나온다 — 행은 좌측 여백째
   * 밀려 썸네일 왼쪽이 잘린다.
   * 미는 제스처는 핸들러가 아니라 가로 스크롤 스냅이 맡는다 — 손가락을 1:1 로 따라오고
   * 관성·되돌아감·접근성(버튼이 항상 DOM 에 있어 키보드/보이스오버로 닿는다)이 공짜다.
   * 같은 이유로 `Carousel` 도 스크롤 스냅을 쓴다.
   *
   * 밀지 않고 꾹 누르기(롱프레스)로도 열린다 — 그때는 우리가 스크롤을 대신 끝까지 보낸다.
   * `select-none` 은 필수다: 없으면 천천히 누르는 동안 WebView 가 텍스트 선택을 시작해
   * 스크롤 제스처가 통째로 끊긴다.
   */
  return (
    <div
      ref={swipeRef}
      className={cn(
        'flex snap-x snap-mandatory select-none overflow-x-auto overscroll-x-contain',
        '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
      onTouchStart={(event) => {
        const touch = event.touches[0];
        if (!touch) return;
        pressOrigin.current = { x: touch.clientX, y: touch.clientY };
        longPressed.current = false;
        clearTimeout(pressTimer.current);
        pressTimer.current = setTimeout(() => {
          longPressed.current = true;
          const scroller = swipeRef.current;
          if (scroller) scroller.scrollLeft = scroller.scrollWidth;
        }, LONG_PRESS_MS);
      }}
      onTouchMove={(event) => {
        const touch = event.touches[0];
        const origin = pressOrigin.current;
        if (!touch || !origin) return;
        // 손가락이 움직이기 시작하면 그건 미는 제스처다 — 롱프레스는 취소한다.
        if (
          Math.abs(touch.clientX - origin.x) > LONG_PRESS_TOLERANCE_PX ||
          Math.abs(touch.clientY - origin.y) > LONG_PRESS_TOLERANCE_PX
        ) {
          clearTimeout(pressTimer.current);
        }
      }}
      onTouchEnd={() => clearTimeout(pressTimer.current)}
      onTouchCancel={() => clearTimeout(pressTimer.current)}
      onClickCapture={(event) => {
        if (!longPressed.current) return;
        longPressed.current = false;
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <div className="w-full shrink-0 snap-start">{row}</div>
      <button
        type="button"
        aria-label={`${place.name} 삭제`}
        onClick={() => {
          // 확인 모달 뒤로 열린 행이 남지 않게 먼저 닫는다(취소해도 원래 모습으로 돌아온다).
          if (swipeRef.current) swipeRef.current.scrollLeft = 0;
          onDelete();
        }}
        className="flex h-16 w-15 shrink-0 snap-start flex-col items-center justify-center gap-0.5 bg-error"
      >
        <Icon20Delete />
        <span className="text-b3 font-medium text-gray-0">삭제</span>
      </button>
    </div>
  );
}

export { PlaceRow };
