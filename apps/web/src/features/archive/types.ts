import type { ArchiveColor } from '@/shared/ui';

/** 공유 아카이브(SHARED)의 원 소유자 표시용. */
export interface ArchiveOwner {
  nickname: string;
  profileImageUrl?: string;
}

/**
 * 취향 아카이브 — 사용자가 장소를 담는 단위.
 * 컴포넌트 표시에 필요한 최소 형태만 둔다. 서버 응답(`GroupResponse`)은
 * `features/archive/api.ts` 에서 이 형태로 변환해 넘긴다.
 */
export interface Archive {
  id: number;
  name: string;
  color: ArchiveColor;
  /** 아카이브에 담긴 장소 수. 배지에 그대로 노출된다. */
  placeCount: number;
  /** 대표 썸네일 URL. 카드에는 앞의 3개까지만 쓴다. */
  thumbnails?: string[];
  /** 공개 아카이브를 만든 계정 표기 (예: "@abcde"). 내 아카이브에는 없다. */
  authorHandle?: string;
  /** 소유 관계 — SHARED 면 읽기 전용 카드로 동작한다. */
  accessType: 'OWNED' | 'SHARED';
  /** SHARED 아카이브의 원 소유자. OWNED 에는 없다. */
  owner?: ArchiveOwner;
  /** 공유 상세 진입용 토큰. 내(OWNED) 아카이브에는 없다. */
  shareToken?: string;
}

/**
 * 2열 그리드 카드(`CollectionCard`)가 그리는 데 필요한 최소 형태.
 * 공개 아카이브(`Archive`)과 아카이브에 저장된 게시물(`ArchivePost`) 둘 다 이 모양을 만족해서
 * 카드 하나로 양쪽을 그린다.
 */
export interface CollectionSummary {
  name: string;
  /** 카드의 `N Places` 표기. 게시물은 `GroupPostSummaryResponse.placeCount` 가 채운다. */
  placeCount: number;
  thumbnails?: string[];
  /**
   * 커버(`thumbnails[0]`)의 미디어 종류 — 카드가 그 위에 종류 표시를 얹는다.
   * 공개 아카이브(`Archive`)의 커버는 게시물 미디어가 아니라 아카이브 대표 사진이라
   * 비워 둔다(표시 없음).
   */
  coverType?: 'IMAGE' | 'VIDEO';
  authorHandle?: string;
  /**
   * 저장 직후 BE 가 아직 처리(본문 크롤링·장소 파싱) 중이거나(`processing`) 처리에
   * 실패해서(`failed`) name/placeCount 가 비어 있을 수 있다는 표시. 공개 아카이브(`Archive`)엔
   * 처리 개념이 없어 항상 undefined다.
   */
  processingState?: 'processing' | 'failed';
}

/** 아카이브에 저장된 게시물 — 아카이브 상세 그리드의 한 칸. */
export interface ArchivePost extends CollectionSummary {
  id: number;
}
