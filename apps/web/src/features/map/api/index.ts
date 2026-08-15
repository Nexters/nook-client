import {
  type CreateGroupRequestColor,
  getMapPlaces as getMapPlacesEndpoint,
  getDetail as getPlaceDetailEndpoint,
  getRecentPlaces as getRecentPlacesEndpoint,
  type MapPlaceResponse,
  type PlacePostResponse,
  type RecentPlaceResponse,
  unwrapApiResponse,
  updateBookmark as updateBookmarkEndpoint,
} from '@/shared/api';
import type { GroupColor } from '@/shared/ui';
import type { MapBounds, MapPin, PlaceDetail, PlaceDetailPost, RecentPlace } from '../types';

/**
 * 서버 색상 코드 ↔ 디자인 토큰 색상. `features/group/api`·`features/post/api`의 매핑과
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
} as const satisfies Record<CreateGroupRequestColor, GroupColor>;

function toMapPin(dto: MapPlaceResponse): MapPin {
  return {
    id: dto.id,
    lat: dto.latitude,
    lng: dto.longitude,
    name: dto.name,
    color: SERVER_TO_UI_COLOR[dto.color as CreateGroupRequestColor] ?? 'cement',
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

function toPlaceDetailPost(dto: PlacePostResponse): PlaceDetailPost {
  return {
    id: dto.postId,
    title: dto.title || '제목 없는 게시물',
    authorHandle: dto.authorIdentifier ?? undefined,
    thumbnail: dto.representativeMedia?.url,
    savedAt: dto.savedAt,
  };
}

export async function fetchPlaceDetail(placeId: number): Promise<PlaceDetail> {
  const response = unwrapApiResponse(
    await getPlaceDetailEndpoint(placeId, undefined, { auth: 'required' }),
  );
  if (!response) throw new Error('장소 상세 응답이 비어 있습니다.');
  return {
    id: response.id,
    name: response.name,
    category: response.category ?? undefined,
    address: response.address,
    lat: response.latitude,
    lng: response.longitude,
    bookmarked: response.bookmarked,
    thumbnail: response.thumbnailUrl ?? undefined,
    // 대표 썸네일이 첫 장이고 그 뒤로 photoUrls 가 붙는다. 썸네일이 photoUrls 에도
    // 들어 있으면 같은 사진이 두 번 나오므로 중복을 걷어낸다.
    photos: [...new Set([response.thumbnailUrl, ...(response.photoUrls ?? [])])].filter(
      (url): url is string => Boolean(url),
    ),
    tags: response.tags ?? [],
    openNow: response.openNow ?? undefined,
    openingHours: response.openingHours ?? undefined,
    posts: (response.posts?.items ?? []).map(toPlaceDetailPost),
  };
}

export async function updatePlaceBookmark(placeId: number, bookmarked: boolean): Promise<void> {
  await updateBookmarkEndpoint(placeId, { bookmarked }, { auth: 'required' });
}
