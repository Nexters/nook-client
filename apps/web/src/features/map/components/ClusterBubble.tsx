import { CustomOverlay } from 'react-naver-maps';

/**
 * 줌아웃 상태에서 근처 북마크 개수만 보여주는 44px 버블 (Figma 139:16757).
 *
 * 시안은 개수와 무관하게 크기가 고정이다(줌아웃 시안의 인스턴스가 전부 44×44).
 * 좌표 기준점은 버블 정중앙 — `CustomOverlay` 가 자식 중앙을 좌표에 맞춘다.
 */
export function ClusterBubble({
  lat,
  lng,
  count,
  onClick,
}: {
  lat: number;
  lng: number;
  count: number;
  onClick?: () => void;
}) {
  return (
    <CustomOverlay position={{ lat, lng }}>
      <button
        type="button"
        onClick={onClick}
        aria-label={`이 근처에 저장한 장소 ${count}곳 — 확대해서 보기`}
        className="flex size-11 items-center justify-center rounded-full bg-gray-90/85 font-medium text-b2 text-gray-0"
      >
        {count}
      </button>
    </CustomOverlay>
  );
}
