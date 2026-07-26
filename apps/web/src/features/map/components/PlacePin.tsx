import { CustomOverlay } from 'react-naver-maps';

export type PlacePinColor =
  | 'yellow'
  | 'red'
  | 'pink'
  | 'purple'
  | 'blue'
  | 'sky'
  | 'green'
  | 'cement';

/*
 * Tailwind 는 클래스명을 소스에서 정적 문자열로 스캔하므로 `bg-${color}` 같은
 * 동적 조합은 생성되지 않는다. 색상별 전체 클래스명을 그대로 매핑해둔다.
 */
const PIN_DOT_CLASS: Record<PlacePinColor, string> = {
  yellow: 'bg-yellow',
  red: 'bg-red',
  pink: 'bg-pink',
  purple: 'bg-purple',
  blue: 'bg-blue',
  sky: 'bg-sky',
  green: 'bg-green',
  cement: 'bg-cement',
};

export function PlacePin({
  lat,
  lng,
  name,
  color,
  onClick,
}: {
  lat: number;
  lng: number;
  name: string;
  color: PlacePinColor;
  onClick?: () => void;
}) {
  return (
    <CustomOverlay position={{ lat, lng }}>
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={onClick}
          className={`rounded-sm ${PIN_DOT_CLASS[color]} w-4 h-4`}
        ></button>
        <span className="text-s1">{name}</span>
      </div>
    </CustomOverlay>
  );
}
