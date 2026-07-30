/** 지도 뷰포트 경계 — `GetMapPlacesParams`(북쪽/남쪽/동쪽/서쪽 위경도)에 대응한다. */
export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * 지도 핀 하나 — `MapPlaceResponse`가 좌표만 내려주므로 이름/카테고리는 없다.
 * 상세 정보는 클릭 시 `usePlaceDetail`로 따로 가져온다.
 */
export interface MapPin {
  id: number;
  lat: number;
  lng: number;
}

/** `PlaceSheet` 목록 모드("최근 저장한 공간")에 쓰는 카드 한 건. */
export interface RecentPlace {
  id: number;
  name: string;
  category?: string;
  address: string;
  thumbnail?: string;
}

/** 장소 상세에 연결된 저장 게시물 한 건 — `PlacePostResponse`를 옮긴 형태. */
export interface PlaceDetailPost {
  id: number;
  title: string;
  authorHandle?: string;
  thumbnail?: string;
  /** 사용자가 게시물에 남긴 메모. 카드의 본문(캡션) 자리에 보여준다. */
  memo?: string;
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
  posts: PlaceDetailPost[];
}
