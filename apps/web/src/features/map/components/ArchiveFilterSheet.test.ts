import { describe, expect, it } from 'vitest';
import type { Archive } from '@/features/archive/types';
import { groupStatusLabel, sortByLastSaved, toArchiveFilter } from './ArchiveFilterSheet';

const archive = (id: number, lastSavedAt?: string): Archive => ({
  id,
  name: `a${id}`,
  color: 'cement',
  placeCount: 0,
  accessType: 'OWNED',
  lastSavedAt,
});

describe('ArchiveFilterSheet 헬퍼', () => {
  it('그룹 상태는 전부 골랐으면 전체, 아니면 선택 수/전체 수', () => {
    expect(groupStatusLabel(4, 4)).toBe('전체');
    expect(groupStatusLabel(3, 4)).toBe('3/4');
    expect(groupStatusLabel(0, 4)).toBe('0/4');
  });

  it('최근 저장순으로 정렬하고 저장 이력 없는 건 순서를 유지한 채 뒤로 보낸다', () => {
    const sorted = sortByLastSaved([
      archive(1),
      archive(2, '2026-10-01T00:00:00'),
      archive(3),
      archive(4, '2026-10-20T00:00:00'),
    ]);
    expect(sorted.map((a) => a.id)).toEqual([4, 2, 1, 3]);
  });

  it('전부 골랐으면 null(전체), 아니면 고른 id 목록', () => {
    const archives = [archive(1), archive(2)];
    expect(toArchiveFilter(new Set([1, 2]), archives)).toBeNull();
    expect(toArchiveFilter(new Set([2]), archives)).toEqual([2]);
    expect(toArchiveFilter(new Set(), archives)).toEqual([]);
  });
});
