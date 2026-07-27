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
  /** 그룹 소유자 이름. 그룹 상세의 "by Purr" 표기에 쓴다. */
  ownerName?: string;
}

/**
 * 2열 그리드 카드(`CollectionCard`)가 그리는 데 필요한 최소 형태.
 * 공개 그룹(`Group`)과 그룹에 저장된 게시물(`GroupPost`) 둘 다 이 모양을 만족해서
 * 카드 하나로 양쪽을 그린다.
 */
export type CollectionSummary = Pick<Group, 'name' | 'placeCount' | 'thumbnails' | 'authorHandle'>;

/** 그룹에 저장된 게시물 — 그룹 상세 그리드의 한 칸. */
export interface GroupPost extends CollectionSummary {
  id: string;
}
