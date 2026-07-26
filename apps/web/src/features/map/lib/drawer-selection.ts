import { PEEK_SNAP_POINT } from '@/features/map/constants';

/**
 * 드로어 스냅이 바뀔 때 선택된 장소를 유지할지 판단한다.
 * peek(최소 높이)까지 내려가면 상세를 접고 기본 목록으로 되돌린다.
 */
export function shouldClearSelectionOnSnapChange(nextSnap: number | string | null): boolean {
  return nextSnap === PEEK_SNAP_POINT;
}
