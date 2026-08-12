import type { GroupColor } from '@/shared/ui';

/**
 * 저장된 게시물 — 사용자가 외부(인스타그램 등)에서 공유해 들여온 원본 글.
 * 표시에 필요한 최소 형태만 둔다.
 */
export interface Post {
  id: string;
  /** 원본 계정 표기 (예: "@nook.official on instagram") */
  authorHandle: string;
  /** 공유한 사람 표기 (예: "by Purr") */
  sharedBy?: string;
  /** 본문. 길면 카드에서 2줄로 접히고 "더보기"가 붙는다. */
  caption?: string;
  /** 본문 이미지들. 카드에서 가로 캐러셀로 펼친다. */
  images?: string[];
  /** 원본 게시물 URL. 없으면 원본 보기 행을 렌더하지 않는다. */
  originalUrl?: string;
  /** 목록·안내 띠에서 쓰는 대표 이미지 */
  thumbnail?: string;
}

/**
 * 게시물 저장 직후 BE 가 비동기로 돌리는 처리 상태(본문 크롤링 → 장소 파싱).
 * PENDING/PROCESSING 동안은 title/media 가 비어 있을 수 있다 — 화면은 이 값을 보고
 * COMPLETED 전까지 로딩으로 취급한다(`features/post/api/queries.ts`).
 */
export type PostProcessingStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

/** 게시물이 속한 그룹 하나 — `SavedPostGroupResponse`를 옮긴 형태. */
export interface PostGroup {
  id: number;
  name: string;
  color: GroupColor;
}

/**
 * 게시물 상세가 한 화면에 필요로 하는 묶음 — 게시물 + 저장된 그룹.
 * `features/post/api` 가 서버 응답(`SavedPostDetailResponse`)을 이 형태로 변환해 넘긴다.
 * 게시물이 여러 그룹에 저장될 수 있어 `groups`는 배열이다.
 */
export interface PostDetail {
  post: Post;
  processingStatus: PostProcessingStatus;
  /** 본문 처리(크롤링·장소 파싱) 진행률 0~100. PENDING/PROCESSING 동안 폴링으로 갱신된다. */
  processingPercent: number;
  title: string;
  groups: PostGroup[];
  memo?: string;
  /** 게시물에서 파싱된 연관 장소. 파싱 전이면 비어 있다. */
  places: ParsedPlace[];
}

/** 게시물 장소 파싱 상태. `PENDING`/`PROCESSING` 동안 폴링한다. */
export type PlaceParsingStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

/**
 * 장소 썸네일 파싱 상태. 장소 파싱이 끝난 뒤에도 장소별로 비동기로 돈다 —
 * `PENDING`/`PROCESSING` 인 장소가 남아 있으면 폴링을 이어간다.
 */
export type ThumbnailParsingStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

/** 파싱된 장소 하나 — 서버 `PlaceResponse` 를 그대로 옮긴 형태(변환 불필요). */
export interface ParsedPlace {
  id: number;
  provider: string;
  externalPlaceId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category?: string;
  phoneNumber: string | null;
  bookmarked: boolean;
  /** 장소 대표 썸네일. `COMPLETED` 전에는 비어 있을 수 있다. */
  thumbnail?: string;
  thumbnailParsingStatus: ThumbnailParsingStatus;
}

export interface PlaceParsingResult {
  postId: number;
  placeParsingStatus: PlaceParsingStatus;
  failureReason: string | null;
  places: ParsedPlace[];
}
