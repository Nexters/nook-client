import type { GroupColor } from '@/shared/ui';

/**
 * 취향 그룹 — 사용자가 장소를 담는 단위.
 * 컴포넌트 표시에 필요한 최소 형태만 둔다. 서버 응답(`GroupResponse`)은
 * `features/group/api.ts` 에서 이 형태로 변환해 넘긴다.
 */
export interface Group {
  id: number;
  name: string;
  color: GroupColor;
  /** 그룹에 담긴 장소 수. 배지에 그대로 노출된다. */
  placeCount: number;
  /** 대표 썸네일 URL. 카드에는 앞의 3개까지만 쓴다. */
  thumbnails?: string[];
  /** 공개 그룹을 만든 계정 표기 (예: "@abcde"). 내 그룹에는 없다. */
  authorHandle?: string;
}

/**
 * 2열 그리드 카드(`CollectionCard`)가 그리는 데 필요한 최소 형태.
 * 공개 그룹(`Group`)과 그룹에 저장된 게시물(`GroupPost`) 둘 다 이 모양을 만족해서
 * 카드 하나로 양쪽을 그린다.
 */
export interface CollectionSummary {
  name: string;
  /** 카드의 `N Places` 표기. 게시물은 `GroupPostSummaryResponse.placeCount` 가 채운다. */
  placeCount: number;
  thumbnails?: string[];
  authorHandle?: string;
  /**
   * 저장 직후 BE 가 아직 처리(본문 크롤링·장소 파싱) 중이거나(`processing`) 처리에
   * 실패해서(`failed`) name/placeCount 가 비어 있을 수 있다는 표시. 공개 그룹(`Group`)엔
   * 처리 개념이 없어 항상 undefined다.
   */
  processingState?: 'processing' | 'failed';
}

/** 그룹에 저장된 게시물 — 그룹 상세 그리드의 한 칸. */
export interface GroupPost extends CollectionSummary {
  id: number;
}
