import { CustomOverlay } from 'react-naver-maps';
import { COLOR_BG_CLASS, type GroupColor } from '@/shared/ui';

export function PlacePin({
  lat,
  lng,
  name,
  color,
  thumbnail,
  selected = false,
  showLabel = false,
  onClick,
}: {
  lat: number;
  lng: number;
  name: string;
  /** 장소를 저장한 대표 그룹의 색상(`GET /places/map` 의 `color`). */
  color: GroupColor;
  /**
   * 선택된 핀을 장소 사진 말풍선으로 바꿀 때 쓰는 썸네일(`GET /places/{placeId}` 의
   * `thumbnailUrl`). 선택 시점에야 상세를 조회하므로 선택된 핀에만 값이 들어온다.
   */
  thumbnail?: string;
  selected?: boolean;
  /**
   * 이름표 표시 여부 — zoom-out 상태에서는 이름표끼리 심하게 겹치므로 호출부(MapView)가
   * 줌 레벨을 보고 정한다. 선택된 핀은 이 값과 무관하게 항상 이름표를 보여준다.
   */
  showLabel?: boolean;
  onClick?: () => void;
}) {
  return (
    <CustomOverlay position={{ lat, lng }}>
      {/* 이름표는 absolute 로 띄운다 — 문서 흐름에 두면 이름 길이만큼 오버레이 박스가
          커지면서 좌표 기준점인 핀 자체가 밀린다. */}
      <div className="relative h-4 w-4">
        {selected && thumbnail ? (
          /* 선택된 핀은 장소 사진 말풍선(48px)이 된다. 꼬리 끝이 원래 핀의 정중앙에
             오도록 컨테이너 중앙에서 위로 세운다(bottom-1/2). 테두리는 색 배경 + 패딩으로
             그린다 — 색상별 border 클래스 맵을 따로 두지 않기 위해서다. */
          <button
            type="button"
            onClick={onClick}
            aria-pressed={selected}
            aria-label={name}
            className="-translate-x-1/2 absolute bottom-1/2 left-1/2 z-10 flex flex-col items-center"
          >
            <span className={`block size-12 p-0.5 ${COLOR_BG_CLASS[color]}`}>
              <img src={thumbnail} alt="" className="size-full bg-gray-0 object-cover" />
            </span>
            {/* 말풍선 꼬리 — 아래를 향하는 삼각형. 위 1px 은 사진 박스와 겹쳐 이음매를 없앤다. */}
            <span
              aria-hidden="true"
              className={`-mt-px block h-2 w-3 ${COLOR_BG_CLASS[color]} [clip-path:polygon(0_0,100%_0,50%_100%)]`}
            />
          </button>
        ) : (
          /* `block`이 없으면 inline-block 버튼이 baseline 정렬 때문에 상속된
             line-height(24px > 컨테이너 16px) 라인 박스 안에서 아래로 내려앉아,
             색 사각형과 흰 구멍이 서로 어긋나 보인다(구멍이 위로 치우쳐 보이는 원인). */
          <button
            type="button"
            onClick={onClick}
            aria-pressed={selected}
            aria-label={name}
            className={`relative block h-4 w-4 ${COLOR_BG_CLASS[color]} ${
              selected ? 'z-10 ring-2 ring-blue ring-offset-2' : ''
            }`}
          >
            {/* Figma 94:4021 — 사각형 가운데가 뚫린 것처럼 보이도록 16px 정사각 안에
                4px 흰 정사각을 정중앙(6,6)에 얹는다. border-radius 는 쓰지 않는다.
                위치 기준은 (다른 무엇에도 밀리지 않는) 버튼 자신이다. */}
            <span className="absolute top-1.5 left-1.5 h-1 w-1 bg-gray-0" />
          </button>
        )}
        {/* 긴 이름은 잘라 핀끼리 겹치지 않게 한다. */}
        {(showLabel || selected) && (
          <span className="-translate-x-1/2 pointer-events-none absolute top-full left-1/2 mt-0.5 block max-w-20 truncate px-1 text-center font-medium text-b3 text-gray-100">
            {name}
          </span>
        )}
      </div>
    </CustomOverlay>
  );
}
