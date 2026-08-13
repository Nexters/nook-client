import { CustomOverlay } from 'react-naver-maps';
import emptyThumbnail from '@/assets/images/98_Group.svg';
import { SelectedPinMarker } from '@/features/map/components/SelectedPinMarker';
import { COLOR_BG_CLASS, type GroupColor } from '@/shared/ui';

/**
 * 개별 장소 핀 — 줌인 상태에서 쓴다(줌아웃은 `ClusterBubble`). Figma 139:16951(기본) ·
 * 139:16888(선택).
 *
 * 기본은 48px 장소 사진, 선택되면 물방울(`SelectedPinMarker`)로 바뀐다. 둘 다 높이가 48px
 * 이고 **그래픽 아래변이 좌표에 오도록** 놓기 때문에 선택될 때 그래픽이 튀지 않는다
 * (물방울은 뾰족한 끝이 좌표를 가리켜야 해서 아래변 기준이 맞다).
 */
export function PlacePin({
  lat,
  lng,
  name,
  color,
  thumbnail,
  selected = false,
  onClick,
}: {
  lat: number;
  lng: number;
  name: string;
  /** 장소를 저장한 대표 그룹의 색상(`GET /places/map` 의 `color`). */
  color: GroupColor;
  /** 장소 대표 썸네일(`GET /places/map` 의 `thumbnailUrl`). 없으면 빈 썸네일 고스트를 그린다. */
  thumbnail?: string;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <CustomOverlay position={{ lat, lng }}>
      {/*
        크기 0 인 앵커. `CustomOverlay` 는 자식의 중앙을 좌표에 맞추므로, 0×0 컨테이너의
        중앙 = 좌표가 되고 그래픽·이름표를 그 기준으로 absolute 배치한다.
        이름표를 문서 흐름에 두면 안 된다 — 이름 길이만큼 컨테이너가 커지면서 기준점이 밀린다.
      */}
      <div className="relative h-0 w-0">
        <button
          type="button"
          onClick={onClick}
          aria-pressed={selected}
          aria-label={name}
          className={`-translate-x-1/2 absolute bottom-0 left-1/2 block ${selected ? 'z-10' : ''}`}
        >
          {selected ? (
            <SelectedPinMarker color={color} />
          ) : (
            <img
              src={thumbnail ?? emptyThumbnail}
              alt=""
              className="block size-12 rounded-lg border-2 border-gray-0 bg-gray-10 object-cover shadow-[0_2px_10px_rgba(0,0,0,0.25)]"
            />
          )}
        </button>
        {/*
          이름표. 좌표 6px 아래에 그린다(시안의 flex column gap 6px 과 같은 간격).
          이름은 위 버튼의 aria-label 이 이미 갖고 있어 스크린리더에는 숨긴다.
        */}
        <span
          aria-hidden="true"
          className={`-translate-x-1/2 pointer-events-none absolute top-1.5 left-1/2 flex items-center gap-1.5 rounded-md ${
            selected
              ? 'border border-gray-20 bg-gray-0 px-[7px] py-[3px] drop-shadow-[0_2px_5px_rgba(0,0,0,0.1)]'
              : 'bg-gray-90/85 px-2 py-1 shadow-[0_2px_10px_rgba(0,0,0,0.2)]'
          }`}
        >
          <span className={`block size-1.5 shrink-0 ${COLOR_BG_CLASS[color]}`} />
          <span
            className={`whitespace-nowrap text-s1 ${selected ? 'text-gray-100' : 'text-gray-10'}`}
          >
            {name}
          </span>
        </span>
      </div>
    </CustomOverlay>
  );
}
