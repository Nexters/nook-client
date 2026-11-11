import { CustomOverlay } from 'react-naver-maps';
import emptyThumbnail from '@/assets/images/98_Group.svg';
import { CategoryGlyph, SelectedPinMarker } from '@/features/map/components/SelectedPinMarker';
import type { PlaceCategoryGroup } from '@/features/map/types';
import { type ArchiveColor, COLOR_BG_CLASS } from '@/shared/ui';

/**
 * 개별 장소 핀 — 줌인 상태와, 줌아웃에서 혼자 남은 장소에 쓴다(여럿이 묶이면 `ClusterBubble`). Figma 326:14057(기본) ·
 * 326:14066(선택), NOOK-327.
 *
 * 기본은 48px 장소 사진에 흰 이름표, 선택되면 56px 물방울(`SelectedPinMarker`)에 어두운
 * 이름표로 바뀐다 — 밝은 지도에서 선택 쪽이 더 도드라지도록 이름표 톤을 서로 뒤집었다.
 * 둘 다 **그래픽 아래변이 좌표에 오도록** 놓기 때문에 높이가 달라도 이름표 자리는 그대로다
 * (물방울은 뾰족한 끝이 좌표를 가리켜야 해서 아래변 기준이 맞다).
 */
export function PlacePin({
  lat,
  lng,
  name,
  color,
  thumbnail,
  categoryGroup,
  selected = false,
  compact = false,
  onClick,
}: {
  lat: number;
  lng: number;
  name: string;
  /** 장소를 저장한 대표 아카이브의 색상(`GET /places/map` 의 `color`). */
  color: ArchiveColor;
  /** 장소 대표 썸네일(`GET /places/map` 의 `thumbnailUrl`). 없으면 빈 썸네일 고스트를 그린다. */
  thumbnail?: string;
  /** 선택 핀 글리프(`GET /places/map` 의 `categoryGroup`). */
  categoryGroup?: PlaceCategoryGroup;
  selected?: boolean;
  /**
   * 검색 결과 지도의 "검색 결과에 없는 주변 장소" 핀(Figma `mappin/검색결과에포함되지않은장소`,
   * NOOK-383) — 28px 회색 원 + 카테고리 글리프 + 작은 이름. 선택되면 일반 선택 핀과 같다.
   */
  compact?: boolean;
  onClick?: () => void;
}) {
  if (compact && !selected) {
    return (
      <CustomOverlay position={{ lat, lng }}>
        {/* 원의 중심이 좌표에 온다 — 대표 이미지 핀과 달리 가리키는 끝이 없는 점 표기라서다. */}
        <div className="relative h-0 w-0">
          <button
            type="button"
            onClick={onClick}
            aria-label={name}
            className="-translate-x-1/2 -translate-y-[14px] absolute top-0 left-1/2 flex w-[52px] flex-col items-center gap-1"
          >
            <span className="flex size-7 items-center justify-center rounded-full border border-gray-0 bg-gray-60">
              <CategoryGlyph
                categoryGroup={categoryGroup}
                size={16}
                className="block text-gray-0"
              />
            </span>
            {/* 이름은 aria-label 이 이미 갖고 있다. 시안 S1 이 Bold 라 토큰(SemiBold)에 굵기만 덮는다. */}
            <span
              aria-hidden="true"
              className="w-max max-w-[72px] truncate text-center font-bold text-gray-100 text-s1"
            >
              {name}
            </span>
          </button>
        </div>
      </CustomOverlay>
    );
  }

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
            <SelectedPinMarker color={color} categoryGroup={categoryGroup} />
          ) : (
            /*
              `max-w-none` 이 없으면 사진 너비가 0 으로 붕괴한다 — Tailwind preflight 의
              `img { max-width: 100% }` 가 폭 0 인 앵커를 기준으로 100% = 0 이 되어
              `size-12` 의 48px 을 눌러버린다. 높이는 눌리지 않아 4×48 짜리 띠만 남는다.
            */
            <img
              src={thumbnail ?? emptyThumbnail}
              alt=""
              className="block size-12 max-w-none rounded-lg border-2 border-gray-0 bg-gray-10 object-cover shadow-[0_2px_15px_rgba(0,0,0,0.3)]"
            />
          )}
          {/*
            이름표. 좌표 6px 아래에 그린다(시안의 flex column gap 6px 과 같은 간격).
            버튼 안에 두어야 이름표를 눌러도 핀이 선택된다. absolute 라 문서 흐름에서 빠져
            버튼 크기(=앵커 기준)에는 영향을 주지 않는다 — 이름이 길어져도 핀이 밀리지 않는다.
            이름 자체는 버튼의 aria-label 이 이미 갖고 있어 스크린리더에는 숨긴다.
          */}
          <span
            aria-hidden="true"
            className={`-translate-x-1/2 absolute top-full left-1/2 mt-1.5 flex items-center gap-1.5 rounded-md px-2 py-1 drop-shadow-[0_2px_7.5px_rgba(0,0,0,0.3)] ${
              selected ? 'bg-gray-90' : 'bg-gray-0'
            }`}
          >
            <span className={`block size-1.5 shrink-0 ${COLOR_BG_CLASS[color]}`} />
            <span
              className={`whitespace-nowrap text-s1 ${selected ? 'text-gray-10' : 'text-gray-100'}`}
            >
              {name}
            </span>
          </span>
        </button>
      </div>
    </CustomOverlay>
  );
}
