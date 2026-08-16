import { useEffect, useState } from 'react';
import { Container as MapDiv, NaverMap, useNavermaps } from 'react-naver-maps';
import { PlacePin } from '@/features/map/components/PlacePin';

// 홈 지도(MapView DEFAULT_ZOOM)와 같은 확대 정도 — 프리뷰도 같은 축척으로 보여준다.
const PREVIEW_ZOOM = 18;

/**
 * 장소 1곳짜리 프리뷰 지도 — 장소 직접 연결 드로어(장소 상세) 뒤에 깔린다.
 *
 * `MapView` 와 달리 핀 목록/클러스터/바운즈 통지가 없고, 넘겨받은 장소 하나를 파란
 * 물방울 핀으로 고정해 보여준다. 팬/줌 조작은 의도적으로 받지 않는다 — 모달 드로어가
 * 떠 있는 동안 바깥 포인터 이벤트는 닫기(dismiss)로 해석되기 때문(호출부가
 * pointer-events 를 살리지 않는 것으로 보장한다).
 *
 * `react-naver-maps` 직접 접근은 `MapView` 와 이 컴포넌트 둘뿐이다 — 지도 SDK 의존을
 * features/map 안에 가둔다. `useNavermaps` 가 스크립트 로드를 suspend 하므로 호출부는
 * `<Suspense>` 로 감싸야 한다.
 */
export function PlacePreviewMap({
  place,
  /**
   * 화면 아래를 가리는 시트의 스냅 비율(0~1). 핀을 그냥 정중앙에 두면 시트 경계에
   * 걸쳐 가려지므로, 시트에 가리지 않는 위쪽 영역의 정가운데((1+snap)/2 높이)에 오도록
   * 지도 중심을 아래로 옮겨 잡는다 — `MapView` 의 panTarget 오프셋과 같은 계산.
   */
  sheetSnapPoint = 0.5,
}: {
  place: { name: string; lat: number; lng: number };
  sheetSnapPoint?: number;
}) {
  const navermaps = useNavermaps();
  const [map, setMap] = useState<naver.maps.Map | null>(null);

  // 인스턴스가 생기는 순간(또는 좌표가 바뀌면) 중심을 잡는다 — `MapView` 와 같은 패턴으로
  // ref 대신 state 에 인스턴스를 들어야 "생긴 순간"에 이 effect 가 다시 돈다.
  useEffect(() => {
    if (!map) return;
    const target = new navermaps.LatLng(place.lat, place.lng);
    const projection = map.getProjection();
    const verticalShiftPx = map.getSize().height * ((1 + sheetSnapPoint) / 2 - 0.5);
    const targetOffset = projection.fromCoordToOffset(target);
    map.setCenter(
      projection.fromOffsetToCoord(
        new navermaps.Point(targetOffset.x, targetOffset.y + verticalShiftPx),
      ),
    );
  }, [map, navermaps, place.lat, place.lng, sheetSnapPoint]);

  return (
    <MapDiv style={{ width: '100%', height: '100%' }}>
      <NaverMap
        ref={setMap}
        defaultCenter={new navermaps.LatLng(place.lat, place.lng)}
        defaultZoom={PREVIEW_ZOOM}
      >
        {/* 검색 결과는 아직 아카이브 색이 없다 — 시안(선택 마커)의 파란 물방울로 고정. */}
        <PlacePin lat={place.lat} lng={place.lng} name={place.name} color="blue" selected />
      </NaverMap>
    </MapDiv>
  );
}
