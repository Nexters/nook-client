/**
 * Figma 시안 기준 스냅(뷰포트 대비 노출 비율).
 * peek: 핸들+타이틀만 살짝(≈185/812) · detailPage: 장소 상세 기본 노출(≈325/812) ·
 * mid: 카드 그리드 전체(≈617/812) · full: 전체화면(장소 상세 확장)
 *
 * vaul 은 snapPoints 배열을 오름차순(가장 접힌 상태 → 완전히 펼친 상태)으로 기대한다
 * (배열의 마지막 값을 "완전히 펼침"으로 취급). 아래 두 배열 순서를 바꾸지 않도록 주의.
 */
export const PEEK_SNAP_POINT = 0.23;
export const DETAIL_PAGE_SNAP_POINT = 0.5;
export const MID_SNAP_POINT = 0.76;
export const FULL_SNAP_POINT = 1;

/**
 * 장소 미선택(카드 그리드 탐색) 상태의 스냅. mid 는 이 상태 전용이고,
 * full(Figma 94:4165)에서는 최근 저장 목록이 전체화면으로 펼쳐진다.
 */
export const BROWSE_SNAP_POINTS = [PEEK_SNAP_POINT, MID_SNAP_POINT, FULL_SNAP_POINT];

/**
 * 장소 선택(상세 보기) 상태의 스냅. mid 는 일부러 뺐다 — mid(카드 그리드 높이)는
 * 상세 콘텐츠와 무관한 높이라 여기 끼워 넣으면 아무 것도 안 바뀌는 정류장이 된다.
 * detailPage 에서 더 당기면 곧장 full 로 넘어간다.
 */
export const DETAIL_SNAP_POINTS = [PEEK_SNAP_POINT, DETAIL_PAGE_SNAP_POINT, FULL_SNAP_POINT];

/**
 * 개별 장소 핀(썸네일+이름표)을 그리는 최소 줌 레벨(네이버 지도 줌 — 클수록 확대, 기본 18).
 * 이보다 zoom-out 하면 핀을 하나하나 찍는 대신 `ClusterBubble` 로 개수만 보여준다.
 *
 */
export const PIN_DETAIL_MIN_ZOOM = 16;

/**
 * 클러스터 병합 반경(화면 픽셀). 기준 핀에서 이 거리 안에 있는 핀이 한 덩어리가 된다.
 * 키우면 더 넓은 범위를 하나로 묶는다. 버블 지름(44px)보다 넉넉해야 버블끼리 붙어 보이지 않는다.
 *
 * 반경이라 한 덩어리의 지름은 이 값의 두 배까지 벌어질 수 있다.
 */
export const CLUSTER_MERGE_RADIUS_PX = 72;

/**
 * 클러스터 버블을 눌렀을 때 확대할 줌 단계. 멤버가 많으면 한 번에 다 풀리지 않고
 * 몇 번 눌러 파고들게 된다 — 한 번에 최대 줌까지 튀는 것보다 위치 감각을 유지하기 쉽다.
 */
export const CLUSTER_ZOOM_STEP = 2;

/**
 * 장소를 선택해 지도를 재센터링할 때, 선택된 핀이 화면 세로 어느 지점에 와야 하는지
 * (뷰포트 하단 기준 비율 — 스냅 포인트와 같은 표기법). 장소를 막 선택한 시점엔 드로어가
 * DETAIL_PAGE_SNAP_POINT 만큼 화면 아래를 가리므로, 핀을 그냥 화면 정중앙(0.5)에 두면
 * 드로어 경계에 걸쳐 가려진다. 남는 위쪽(드로어에 가려지지 않는) 영역의 정중앙에 오도록
 * 계산하면 (1 + DETAIL_PAGE_SNAP_POINT) / 2 가 된다.
 */
export const SELECTED_PLACE_VERTICAL_RATIO = (1 + DETAIL_PAGE_SNAP_POINT) / 2;
