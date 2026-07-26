import type { GroupColor } from '@/shared/ui';

/**
 * 취향 그룹 — 사용자가 장소를 담는 단위.
 * 컴포넌트 표시에 필요한 최소 형태만 둔다. 서버 응답 스키마가 정해지면
 * `features/group/api.ts` 에서 이 형태로 변환해 넘긴다.
 */
export interface Group {
  id: string;
  name: string;
  color: GroupColor;
  /** 그룹에 담긴 장소 수. 배지에 그대로 노출된다. */
  placeCount: number;
  /** 대표 썸네일 URL. 카드에는 앞의 3개까지만 쓴다. */
  thumbnails?: string[];
  /** 공개 그룹을 만든 계정 표기 (예: "@abcde"). 내 그룹에는 없다. */
  authorHandle?: string;
}
