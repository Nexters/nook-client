import { LocationCrosshair } from '@/shared/icons/NookIcons';

/** 버튼과 드로어 상단 사이 간격(px). 스냅이 바뀌어도 이 간격은 유지된다. */
const GAP_ABOVE_SHEET = 20;

/**
 * 현재 위치로 지도를 되돌리는 버튼(Figma `Button/40_location`).
 *
 * 드로어 위에 얹혀 스냅을 따라 함께 오르내린다 — `snapPoint`(뷰포트 대비 드로어 노출
 * 비율)만큼 띄우고 그 위로 항상 같은 간격을 둔다. 드로어가 화면 대부분을 덮는 스냅
 * (mid/full)에서는 버튼이 설 자리가 없으므로 상위(MapPage)가 아예 렌더하지 않는다.
 *
 * 전환 커브·시간은 vaul 이 드로어에 쓰는 값과 맞췄다 — 그래야 스냅이 바뀔 때 버튼이
 * 드로어에 붙어 함께 움직이는 것처럼 보인다.
 */
export function RecenterButton({
  onClick,
  snapPoint,
}: {
  onClick: () => void;
  /** 현재 드로어 스냅(0~1). 이 비율만큼 화면 아래에서 띄운다. */
  snapPoint: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="현재 위치로 이동"
      className="absolute right-4 flex size-10 items-center justify-center rounded-full bg-gray-0 text-gray-100 drop-shadow-[0px_0px_2px_rgba(31,31,31,0.3)] transition-[bottom] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
      style={{ bottom: `calc(${snapPoint * 100}% + ${GAP_ABOVE_SHEET}px)` }}
    >
      <LocationCrosshair className="size-4" />
    </button>
  );
}
