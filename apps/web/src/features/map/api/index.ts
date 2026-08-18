import {
  type CreateGroupRequestColor,
  disconnectPlace as disconnectPlaceEndpoint,
  getMapPlaces as getMapPlacesEndpoint,
  getDetail as getPlaceDetailEndpoint,
  getRecentPlaces as getRecentPlacesEndpoint,
  type MapPlaceResponse,
  type PlaceDetailResponse,
  type PlacePostResponse,
  type RecentPlaceResponse,
  type SavedPlaceSearchItemResponse,
  type SavedPlaceSearchPageResponse,
  searchSavedPlaces as searchSavedPlacesEndpoint,
  placeDetail as sharedPlaceDetailEndpoint,
  unwrapApiResponse,
  updateBookmark as updateBookmarkEndpoint,
  // 생성기가 `/posts/{postId}/memo` 와 이름이 겹쳐 붙인 `_1` 접미사다 — 여기서만 풀어준다.
  updateMemo1 as updateMemoEndpoint,
} from '@/shared/api';
import type { ArchiveColor } from '@/shared/ui';
import type {
  MapBounds,
  MapPin,
  PlaceDetail,
  PlaceDetailPost,
  RecentPlace,
  SavedPlaceSearchPage,
  SavedPlaceSearchResult,
} from '../types';

/**
 * 서버 색상 코드 ↔ 디자인 토큰 색상. `features/archive/api`·`features/post/api`의 매핑과
 * 동일한 서버 enum이라 값도 그대로 맞춘다 — 각 feature가 자기 진입점을 소유하는 컨벤션.
 */
const SERVER_TO_UI_COLOR = {
  YELLOW: 'yellow',
  CORAL: 'red',
  PINK: 'pink',
  PURPLE: 'purple',
  BLUE: 'blue',
  MINT: 'sky',
  GREEN: 'green',
  GRAY: 'cement',
} as const satisfies Record<CreateGroupRequestColor, ArchiveColor>;

function toMapPin(dto: MapPlaceResponse): MapPin {
  return {
    id: dto.id,
    lat: dto.latitude,
    lng: dto.longitude,
    name: dto.name,
    color: SERVER_TO_UI_COLOR[dto.color as CreateGroupRequestColor] ?? 'cement',
    thumbnail: dto.thumbnailUrl ?? undefined,
  };
}

/** 지도 뷰포트(bbox) 안의 북마크 장소 핀. `MapView`의 `onIdle`이 넘긴 실제 뷰포트 경계로 조회한다. */
export async function fetchMapPins(bounds: MapBounds): Promise<MapPin[]> {
  const pins = unwrapApiResponse(
    await getMapPlacesEndpoint(
      {
        northLatitude: bounds.north,
        southLatitude: bounds.south,
        eastLongitude: bounds.east,
        westLongitude: bounds.west,
      },
      { auth: 'required' },
    ),
  );
  return (pins ?? []).map(toMapPin);
}

function toRecentPlace(dto: RecentPlaceResponse): RecentPlace {
  return {
    id: dto.id,
    name: dto.name,
    category: dto.category ?? undefined,
    address: dto.address,
    thumbnail: dto.thumbnailUrl ?? undefined,
  };
}

export async function fetchRecentPlaces(): Promise<RecentPlace[]> {
  const response = unwrapApiResponse(
    await getRecentPlacesEndpoint(undefined, { auth: 'required' }),
  );
  return (response?.items ?? []).map(toRecentPlace);
}

function toSavedPlaceSearchResult(dto: SavedPlaceSearchItemResponse): SavedPlaceSearchResult {
  const [region] = dto.address.split(' ');
  return {
    id: dto.id,
    name: dto.name,
    category: dto.category ?? undefined,
    region: region || undefined,
    thumbnail: dto.thumbnailUrl ?? undefined,
  };
}

export function toSavedPlaceSearchPage(dto: SavedPlaceSearchPageResponse): SavedPlaceSearchPage {
  return {
    items: dto.items.map(toSavedPlaceSearchResult),
    groups: dto.groups.map((group) => ({
      id: group.id,
      name: group.name,
      color: SERVER_TO_UI_COLOR[group.color as CreateGroupRequestColor] ?? 'cement',
    })),
    totalCount: dto.totalElements,
  };
}

/**
 * `GET /api/v1/places/saved/search` — 저장한 공간 검색. 서버 최대 페이지 크기(100)로
 * 첫 페이지만 조회한다 — 검색 UI 가 페이지네이션 없이 한 목록으로 그리고, 저장 장소가
 * 검색어까지 걸러 100건을 넘는 경우는 실사용에서 없다고 본다(넘치면 건수만 전체를 가리킨다).
 */
export async function fetchSavedPlaceSearch(
  query: string,
  groupId: number | null,
): Promise<SavedPlaceSearchPage> {
  const response = unwrapApiResponse(
    await searchSavedPlacesEndpoint(
      { query, page: 0, size: 100, ...(groupId !== null && { groupId }) },
      { auth: 'required' },
    ),
  );
  if (!response) return { items: [], groups: [], totalCount: 0 };
  return toSavedPlaceSearchPage(response);
}

function toPlaceDetailPost(dto: PlacePostResponse): PlaceDetailPost {
  return {
    id: dto.postId,
    title: dto.title || '제목 없는 게시물',
    authorHandle: dto.authorIdentifier ?? undefined,
    thumbnail: dto.representativeMedia?.url,
    savedAt: dto.savedAt,
  };
}

export function toPlaceDetail(dto: PlaceDetailResponse): PlaceDetail {
  return {
    id: dto.id,
    name: dto.name,
    category: dto.category ?? undefined,
    address: dto.address,
    lat: dto.latitude,
    lng: dto.longitude,
    bookmarked: dto.bookmarked,
    thumbnail: dto.thumbnailUrl ?? undefined,
    // 대표 썸네일이 첫 장이고 그 뒤로 photoUrls 가 붙는다. 썸네일이 photoUrls 에도
    // 들어 있으면 같은 사진이 두 번 나오므로 중복을 걷어낸다.
    photos: [...new Set([dto.thumbnailUrl, ...(dto.photoUrls ?? [])])].filter(
      (url): url is string => Boolean(url),
    ),
    tags: dto.tags ?? [],
    openNow: dto.openNow ?? undefined,
    openingHours: dto.openingHours ?? undefined,
    memo: dto.memo ?? undefined,
    posts: (dto.posts?.items ?? []).map(toPlaceDetailPost),
  };
}

export async function fetchPlaceDetail(placeId: number): Promise<PlaceDetail> {
  const response = unwrapApiResponse(
    await getPlaceDetailEndpoint(placeId, undefined, { auth: 'required' }),
  );
  if (!response) throw new Error('장소 상세 응답이 비어 있습니다.');
  return toPlaceDetail(response);
}

/**
 * 공유 아카이브 토큰 스코프의 장소 상세(`GET /api/public/v1/groups/{token}/places/{placeId}`).
 * `GET /places/{placeId}` 는 내가 저장한 장소 기준이라 공유 아카이브에서 딥링크로 들어온,
 * 아직 저장하지 않은 장소는 404 가 난다 — 그 폴백 전용이다(`usePlaceDetail`).
 */
export async function fetchSharedPlaceDetail(token: string, placeId: number): Promise<PlaceDetail> {
  const dto = unwrapApiResponse(await sharedPlaceDetailEndpoint(token, placeId));
  if (!dto) throw new Error('공유 장소 응답이 비어 있어요');
  return toPlaceDetail(dto);
}

export async function updatePlaceBookmark(placeId: number, bookmarked: boolean): Promise<void> {
  await updateBookmarkEndpoint(placeId, { bookmarked }, { auth: 'required' });
}

/**
 * `DELETE /api/v1/posts/{postId}/places/{placeId}` — 저장 게시물의 장소 연결 삭제.
 * 게시물 도메인 엔드포인트지만(`features/post/api` 와 동일 호출) 각 feature 가 자기
 * 진입점을 소유한다 — 테스트가 feature api 모듈 단위로 모킹하는 컨벤션 때문이다.
 */
export async function disconnectPostPlace(postId: number, placeId: number): Promise<void> {
  await disconnectPlaceEndpoint(postId, placeId, { auth: 'required' });
}

/** `PATCH /api/v1/places/{placeId}/memo` — 장소 메모 변경. 빈 문자열은 삭제(null)로 보낸다. */
export async function updatePlaceMemo(placeId: number, memo: string): Promise<void> {
  const trimmed = memo.trim();
  await updateMemoEndpoint(placeId, { memo: trimmed || null }, { auth: 'required' });
}
