import { useRef } from 'react';
import { cn } from '@/shared/lib/utils';
import { Thumbnail } from '@/shared/ui';
import type { Place } from '../types';

/**
 * 카드가 지도 바텀시트(vaul) 안에 놓일 때, 카드 위에서 시작한 드래그로 시트를 끌어내려도
 * vaul 이 클릭을 취소해주지 않아 손을 뗀 자리에 클릭이 그대로 발생한다(고스트 클릭) —
 * touch-action:none 으로 브라우저의 기본 탭/드래그 판별을 꺼둔 채 자기가 preventDefault
 * 를 안 하기 때문. 누른 지점에서 이 거리(px) 이상 움직였으면 드래그로 보고 클릭을 무시한다.
 */
const DRAG_CLICK_THRESHOLD_PX = 10;

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
  className?: string;
}

function PlaceCard({ place, onClick, className }: PlaceCardProps) {
  const Comp = onClick ? 'button' : 'div';
  const isProcessing = place.thumbnailState === 'processing';
  const isFailed = place.thumbnailState === 'failed';
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);

  return (
    <Comp
      {...(onClick
        ? {
            type: 'button' as const,
            onPointerDown: (e: React.PointerEvent) => {
              pointerDownPos.current = { x: e.clientX, y: e.clientY };
            },
            onClick: (e: React.MouseEvent) => {
              const start = pointerDownPos.current;
              pointerDownPos.current = null;
              if (start) {
                const dx = e.clientX - start.x;
                const dy = e.clientY - start.y;
                if (Math.hypot(dx, dy) > DRAG_CLICK_THRESHOLD_PX) return;
              }
              onClick();
            },
          }
        : {})}
      className={cn(
        'flex w-full flex-col items-start gap-1 bg-gray-0 pb-2 text-left',
        onClick &&
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100 focus-visible:ring-offset-2',
        className,
      )}
    >
      {/* 시안 167x208. 화면 폭이 달라져도 같은 모양이 되게 고정 높이 대신 비율로 잡는다. */}
      <Thumbnail
        src={place.thumbnail}
        alt=""
        loading={isProcessing}
        failed={isFailed}
        className="aspect-[167/208] h-auto w-full"
      />
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
