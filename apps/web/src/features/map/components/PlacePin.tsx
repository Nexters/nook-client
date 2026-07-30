import { CustomOverlay } from 'react-naver-maps';
import { COLOR_BG_CLASS, type GroupColor } from '@/shared/ui';

export function PlacePin({
  lat,
  lng,
  name,
  color,
  selected = false,
  onClick,
}: {
  lat: number;
  lng: number;
  name: string;
  /** 장소를 저장한 대표 그룹의 색상(`GET /places/map` 의 `color`). */
  color: GroupColor;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <CustomOverlay position={{ lat, lng }}>
      {/* 이름표는 absolute 로 띄운다 — 문서 흐름에 두면 이름 길이만큼 오버레이 박스가
          커지면서 좌표 기준점인 핀 자체가 밀린다. */}
      <div className="relative h-4 w-4">
        <button
          type="button"
          onClick={onClick}
          aria-pressed={selected}
          aria-label={name}
          className={`h-4 w-4 ${COLOR_BG_CLASS[color]} ${
            selected ? 'z-10 ring-2 ring-blue ring-offset-2' : ''
          }`}
        >
          {/* Figma 94:3999/94:4000 — 사각형 가운데가 뚫린 것처럼 보이도록 16px 정사각 안에
              4px 흰 정사각을 시각 중심에 맞춰 (6,8)에 얹는다. border-radius 는 쓰지 않는다. */}
          <span className="absolute top-[8px] left-1.5 h-1 w-1 bg-gray-0" />
        </button>
        {/* 긴 이름은 잘라 핀끼리 겹치지 않게 한다. */}
        {/* <span className="-translate-x-1/2 pointer-events-none absolute top-full left-1/2 mt-1 block max-w-20 truncate rounded-sm bg-gray-0/80 px-1 text-center font-bold text-b3 text-gray-100">
          {name}
        </span> */}
        <span className="-translate-x-1/2 pointer-events-none absolute top-full left-1/2 mt-1 block max-w-20 truncate px-1 text-center font-bold text-b3 text-gray-100">
          {name}
        </span>
      </div>
    </CustomOverlay>
  );
}
