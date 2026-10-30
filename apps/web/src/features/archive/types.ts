import type { ArchiveColor } from '@/shared/ui';

/** 아카이브를 추가한 사람 — 목록은 읽기 전용이라 표시에 필요한 것만 둔다. */
export interface ArchiveSubscriber {
  nickname: string;
  profileImageUrl?: string;
}

export interface ArchiveSubscriberPage {
  subscribers: ArchiveSubscriber[];
  /** 다음 페이지 번호. 없으면 마지막 페이지다. */
  nextPage?: number;
}

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
  /** 소개글 원문(줄바꿈 포함). 미입력이거나 필드가 없는 응답이면 undefined. */
  description?: string;
  /** 이 아카이브를 자기 NOOK 에 추가(구독)한 사람 수. 0·없음이면 상세에 `N명이 추가함` 을 숨긴다. */
  subscriberCount?: number;
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
  /** 내 아카이브에 마지막으로 게시물을 저장한 시각. 저장 이력이 없거나 공유 아카이브면 없다. */
  lastSavedAt?: string;
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
