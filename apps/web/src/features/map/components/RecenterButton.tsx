import { PEEK_SNAP_POINT } from '@/features/map/constants';
import { LocationCrosshair } from '@/shared/icons/NookIcons';

/**
 * 현재 위치로 지도를 되돌리는 버튼(Figma `Button/40_location`).
 * 드로어가 peek(최소 높이)일 때만 보인다 — mid/full 에서는 드로어가 이 버튼
 * 자리를 덮으므로, 상위(MapPage)에서 snap 이 peek 일 때만 렌더한다.
 *
 * peek 스냅에서 드로어는 BottomMenu 위에 앉도록 BOTTOM_MENU_HEIGHT 만큼 띄워져
 * 있으므로(PlaceSheet 참고), 이 버튼도 같은 만큼 더 띄워야 드로어 핸들과 겹치지 않는다.
 */
export function RecenterButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="현재 위치로 이동"
      className="absolute right-4 flex size-10 items-center justify-center rounded-full bg-gray-0 text-gray-100 drop-shadow-[0px_0px_2px_rgba(31,31,31,0.3)]"
      style={{ bottom: `calc(${PEEK_SNAP_POINT * 100}% + 20px ` }}
    >
      <LocationCrosshair className="size-4" />
    </button>
  );
}
