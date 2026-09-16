/**
 * 핀치 중 손가락 이동을 지도 이동으로 이어 준다.
 *
 * 네이버 지도 JS API v3 는 핀치가 시작될 때 두 손가락의 중심을 줌 원점으로 한 번 잡고,
 * 그 뒤 중심이 움직여도 지도를 옮기지 않는다(내부 `_onChangeZoomingBy` 가 첫 pinch 의
 * center 만 `_scaleEventOrigin` 으로 고정한다). 그래서 두 손가락을 벌리면서 옆으로 끌어도
 * 처음 찍은 자리를 기준으로 확대만 되고, 네이버 지도 앱(네이티브 SDK)처럼 손가락을 따라오지
 * 않는다. 옵션으로 켤 수 없어 여기서 보정한다.
 *
 * 지도가 발화하는 `pinchstart`/`pinch`/`pinchend` 이벤트의 `offset`(컨테이너 기준 픽셀) 을
 * 받아, 직전 pinch 이후 중심이 움직인 만큼 지도 중심 좌표를 반대 방향으로 옮긴다. 핀치 중에도
 * SDK 가 zoom 을 실시간으로 갱신하므로 투영(projection)의 픽셀 단위는 현재 배율을 이미
 * 반영한다 — 별도의 배율 보정은 하지 않는다.
 */
export function attachPinchPan(map: naver.maps.Map, navermaps: typeof naver.maps): () => void {
  let prevOffset: naver.maps.Point | null = null;

  const onPinchStart = (event: naver.maps.PointerEvent) => {
    prevOffset = event.offset ?? null;
  };

  const onPinch = (event: naver.maps.PointerEvent) => {
    const offset = event.offset;
    if (!prevOffset || !offset) return;
    const dx = offset.x - prevOffset.x;
    const dy = offset.y - prevOffset.y;
    prevOffset = offset;
    if (dx === 0 && dy === 0) return;

    const projection = map.getProjection();
    if (!projection) return;
    const center = projection.fromCoordToOffset(map.getCenter());
    map.setCenter(projection.fromOffsetToCoord(new navermaps.Point(center.x - dx, center.y - dy)));
  };

  const onPinchEnd = () => {
    prevOffset = null;
  };

  const listeners = [
    navermaps.Event.addListener(map, 'pinchstart', onPinchStart),
    navermaps.Event.addListener(map, 'pinch', onPinch),
    navermaps.Event.addListener(map, 'pinchend', onPinchEnd),
  ];

  return () => {
    for (const listener of listeners) navermaps.Event.removeListener(listener);
  };
}
