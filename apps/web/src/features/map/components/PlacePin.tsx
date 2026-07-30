import { CustomOverlay } from 'react-naver-maps';

/**
 * 실제 지도 핀엔 이름표가 없다 — `GET /places/map` 응답이 좌표(id/lat/lng)만 내려줘
 * 핀 단계에선 장소 이름을 모른다(클릭 후 상세 조회로만 알 수 있다). 색상도 서버에
 * 구분 개념이 없어 전부 이 한 색으로 통일한다 — 목데이터 시절의 그룹별 색 구분은
 * 서버 응답에 대응하는 필드가 생기기 전까지 재현하지 않는다.
 */
const PIN_DOT_CLASS = 'bg-cement';

export function PlacePin({
  lat,
  lng,
  selected = false,
  onClick,
}: {
  lat: number;
  lng: number;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <CustomOverlay position={{ lat, lng }}>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={selected}
        aria-label="저장된 장소"
        className={`h-4 w-4 rounded-sm ${PIN_DOT_CLASS} ${
          selected ? 'ring-2 ring-blue ring-offset-2' : ''
        }`}
      ></button>
    </CustomOverlay>
  );
}
