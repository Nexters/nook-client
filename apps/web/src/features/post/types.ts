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
