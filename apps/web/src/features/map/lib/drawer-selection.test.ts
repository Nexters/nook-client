import { describe, expect, it } from 'vitest';
import { FULL_SNAP_POINT, MID_SNAP_POINT, PEEK_SNAP_POINT } from '@/features/map/constants';
import { shouldClearSelectionOnSnapChange } from '@/features/map/lib/drawer-selection';

describe('shouldClearSelectionOnSnapChange', () => {
  it('peek(최소 높이)로 내려가면 선택을 해제한다', () => {
    expect(shouldClearSelectionOnSnapChange(PEEK_SNAP_POINT)).toBe(true);
  });

  it('mid/full 에서는 선택을 유지한다', () => {
    expect(shouldClearSelectionOnSnapChange(MID_SNAP_POINT)).toBe(false);
    expect(shouldClearSelectionOnSnapChange(FULL_SNAP_POINT)).toBe(false);
  });

  it('닫힘(null) 상태에서는 peek 가 아니므로 유지로 판단한다', () => {
    expect(shouldClearSelectionOnSnapChange(null)).toBe(false);
  });
});
