import { CustomOverlay } from 'react-naver-maps';
import type { MapPin } from '@/features/map/types';

export function ExpandedClusterPins({
  lat,
  lng,
  pins,
  collapseOffsetX,
  onCollapse,
  onSelectPlace,
}: {
  lat: number;
  lng: number;
  pins: MapPin[];
  collapseOffsetX: number;
  onCollapse: () => void;
  onSelectPlace: (id: number) => void;
}) {
  return (
    <CustomOverlay position={{ lat, lng }}>
      <div className="pointer-events-none relative z-20 size-0">
        {pins.map((pin, index) => {
          const row = Math.floor(index / 3);
          const count = Math.min(pins.length - row * 3, 3);
          const x = ((index % 3) - (count - 1) / 2) * 81;
          const y = -76 - row * 82 - (count === 3 && index % 3 === 1 ? 14 : 0);
          return (
            <div key={pin.id}>
              <span
                aria-hidden="true"
                className="absolute left-0 top-0 h-0.5 origin-left rounded bg-gray-60/75"
                style={{
                  width: Math.hypot(x, y),
                  transform: `rotate(${Math.atan2(y, x)}rad)`,
                }}
              />
              <button
                type="button"
                aria-label={pin.name}
                onClick={() => onSelectPlace(pin.id)}
                className="pointer-events-auto absolute z-10 flex w-[74px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 rounded-xl border border-gray-20 bg-gray-0 px-1 py-1 shadow-md"
                style={{ left: x, top: y }}
              >
                {pin.thumbnail ? (
                  <img src={pin.thumbnail} alt="" className="size-9 rounded-md object-cover" />
                ) : null}
                <span className="w-full truncate text-[11px] font-semibold text-gray-100">
                  {pin.name}
                </span>
              </button>
            </div>
          );
        })}
        <span
          aria-hidden="true"
          className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gray-90"
        />
        <button
          type="button"
          style={{ left: collapseOffsetX }}
          aria-label="펼친 장소 접기"
          onClick={onCollapse}
          className="pointer-events-auto absolute z-10 grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-gray-0 bg-gray-90 text-gray-0 shadow-md"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </CustomOverlay>
  );
}
