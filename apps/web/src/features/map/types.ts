import type { PlaceOpeningHoursResponse } from '@/shared/api';
import type { ArchiveColor } from '@/shared/ui';

/** 지도 뷰포트 경계 — `GetMapPlacesParams`(북쪽/남쪽/동쪽/서쪽 위경도)에 대응한다. */
export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * 지도 핀 하나 — `MapPlaceResponse` 기준. 이름·대표 아카이브 색상·대표 썸네일까지 내려오므로
 * 핀 단계에서 사진과 이름표를 다 그린다. 나머지 상세는 클릭 시 `usePlaceDetail`로 가져온다.
 */
export interface MapPin {
  id: number;
  lat: number;
  lng: number;
  name: string;
  /** 장소를 저장한 대표 아카이브의 색상. */
  color: ArchiveColor;
  /** 장소 대표 썸네일. 없으면 핀이 빈 썸네일 고스트로 그려진다. */
  thumbnail?: string;
}

/** `PlaceSheet` 목록 모드("최근 저장한 공간")에 쓰는 카드 한 건. */
export interface RecentPlace {
  id: number;
  name: string;
  category?: string;
  address: string;
  thumbnail?: string;
  /** 썸네일 파싱 처리 상태. `features/place`의 `Place.thumbnailState`와 같은 의미다. */
  thumbnailState?: 'processing' | 'failed';
  /**
   * 이 장소에 닿는 경로 — `SHARED` 는 내가 저장한 게 아니라 구독한 공유 아카이브를
   * 통해서만 보이는 장소다. 상세를 내 API 로 조회하면 게시물이 비어 내려오므로
   * 아래 `shareToken` 으로 공유 공개 API 를 타야 한다.
   */
  accessType: PlaceAccessType;
  /** `accessType` 이 `SHARED` 일 때만 있는 공유 그룹 토큰. 내 장소면 null 이다. */
  shareToken: string | null;
}

/** 장소 접근 유형 — `RecentPlaceResponse.accessType` 을 그대로 옮긴 형태. */
export type PlaceAccessType = 'OWNED' | 'SHARED';

/**
 * 저장한 공간 검색 결과 한 건 — 검색 모드의 장소 카드가 그리는 최소 형태.
 * `SavedPlaceSearchItemResponse`를 옮긴 형태다.
 */
export interface SavedPlaceSearchResult {
  id: number;
  name: string;
  category?: string;
  /** 카드의 지역 표기(예: "서울") — 주소의 첫 토큰. */
  region?: string;
  thumbnail?: string;
}

/** 검색어와 일치하는 장소가 담긴 그룹 한 건 — 그룹 칩 필터가 그리는 형태. */
export interface SavedPlaceSearchGroup {
  id: number;
  name: string;
  color: ArchiveColor;
}

/**
 * 저장한 공간 검색 한 페이지 — 목록과 별개로 전체 건수(`N건` 표기)와
 * 칩 필터용 그룹 목록을 함께 나른다.
 */
export interface SavedPlaceSearchPage {
  items: SavedPlaceSearchResult[];
  groups: SavedPlaceSearchGroup[];
  totalCount: number;
}

/** 장소 상세에 연결된 저장 게시물 한 건 — `PlacePostResponse`를 옮긴 형태. */
export interface PlaceDetailPost {
  id: number;
  title: string;
  authorHandle?: string;
  thumbnail?: string;
  savedAt: string;
}

/** 장소 상세 — `PlaceDetailResponse`를 화면 모델로 옮긴 형태. */
export interface PlaceDetail {
  id: number;
  name: string;
  category?: string;
  address: string;
  lat: number;
  lng: number;
  bookmarked: boolean;
  /** 장소 대표 썸네일. 없으면 회색 플레이스홀더로 렌더된다. */
  thumbnail?: string;
  /**
   * 캐러셀에 보여줄 사진 — 대표 썸네일 + `photoUrls`(최대 5장) 순서. 총 최대 6장.
   * 썸네일뿐이면(=`photoUrls` 가 비었으면) 1장짜리 배열이라 사진 태그가 붙지 않는다.
   */
  photos: string[];
  /** AI 요약 태그. 서버가 준 만큼 그대로 보여준다. */
  tags: string[];
  /** 현재 영업 여부. 서버가 판단해 내려준다(모르면 undefined). */
  openNow?: boolean;
  openingHours?: PlaceOpeningHoursResponse;
  /** 사용자가 이 장소에 남긴 메모. 게시물 메모와 별개다(`PATCH /places/{placeId}/memo`). */
  memo?: string;
  posts: PlaceDetailPost[];
  /**
   * 이 장소에 저장된 게시물 전체 개수 — 서버가 준 `totalElements` 그대로다.
   * 위 `posts` 는 첫 페이지까지만 담겨서 21건째부터 `posts.length` 와 벌어지므로,
   * 개수를 보여줄 때는 항상 이 값을 쓴다(시트 헤더의 "저장된 게시물 N").
   */
  postsTotal: number;
}
