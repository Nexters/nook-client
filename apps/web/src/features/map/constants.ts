/**
 * Figma 시안 기준 스냅(뷰포트 대비 노출 비율).
 * peek: 핸들+타이틀만 살짝(≈185/812) · detailPage: 장소 상세 기본 노출(≈325/812) ·
 * mid: 카드 그리드 전체(≈617/812) · full: 전체화면(장소 상세 확장)
 *
 * vaul 은 snapPoints 배열을 오름차순(가장 접힌 상태 → 완전히 펼친 상태)으로 기대한다
 * (배열의 마지막 값을 "완전히 펼침"으로 취급). SNAP_POINTS 순서를 바꾸지 않도록 주의.
 */
export const PEEK_SNAP_POINT = 0.23;
export const DETAIL_PAGE_SNAP_POINT = 0.5;
export const MID_SNAP_POINT = 0.76;
export const FULL_SNAP_POINT = 1;
export const SNAP_POINTS = [
  PEEK_SNAP_POINT,
  DETAIL_PAGE_SNAP_POINT,
  MID_SNAP_POINT,
  FULL_SNAP_POINT,
];
