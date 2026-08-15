import { Icon24CheckOff, Icon24CheckOn } from '@/shared/icons/NookIcons';
import { cn } from '@/shared/lib/utils';
import { Thumbnail } from '@/shared/ui';
import type { Place } from '../types';

/**
 * Figma `장소 카드`.
 * 2열 그리드에 놓이는 세로형 장소 카드 — 큰 썸네일 + 이름 + 지역·업종.
 *
 * 시안 폭은 167.5px 이지만 그건 (343 - gap 8) / 2 라서, 카드 자신은 `w-full` 로 두고
 * 열 수는 부모 그리드가 정한다.
 *
 * 가로형 `PlaceRow`(List/64_Place)와 같은 `Place` 를 쓰지만 보여주는 항목이 다르다 —
 * 이쪽은 거리 대신 지역(`region`)을 쓰고 주소·즐겨찾기는 노출하지 않는다.
 */
export interface PlaceCardProps {
  place: Place;
  onClick?: () => void;
  /**
   * 선택 삭제 모드 — 정의하면 썸네일 우상단에 체크가 뜨고 선택된 카드는 흰색 딤으로
   * 표시된다(`CollectionCard` 와 같은 표기). 토글 동작 자체는 onClick 책임이다.
   */
  selected?: boolean;
  className?: string;
}

function PlaceCard({ place, onClick, selected, className }: PlaceCardProps) {
  const Comp = onClick ? 'button' : 'div';

  return (
    <Comp
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      {...(selected !== undefined ? { 'aria-pressed': selected } : {})}
      className={cn(
        'flex w-full flex-col items-start gap-1 bg-gray-0 pb-2 text-left',
        onClick &&
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100 focus-visible:ring-offset-2',
        className,
      )}
    >
      {/* 시안 167x208. 화면 폭이 달라져도 같은 모양이 되게 고정 높이 대신 비율로 잡는다. */}
      <span className="relative w-full">
        <Thumbnail src={place.thumbnail} alt="" className="aspect-[167/208] h-auto w-full" />
        {selected !== undefined ? (
          <>
            {selected ? (
              <span aria-hidden="true" className="absolute inset-0 rounded-sm bg-gray-0/40" />
            ) : null}
            <span aria-hidden="true" className="absolute top-2 right-2">
              {selected ? <Icon24CheckOn /> : <Icon24CheckOff />}
            </span>
          </>
        ) : null}
      </span>
      <div className="flex w-full flex-col gap-0.5 p-1">
        <p className="line-clamp-2 text-b2 font-semibold text-gray-90">{place.name}</p>
        <p className="truncate text-b3 font-medium text-gray-60">
          {[place.region, place.category].filter(Boolean).join(' • ')}
        </p>
      </div>
    </Comp>
  );
}

export { PlaceCard };
