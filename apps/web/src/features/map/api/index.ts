import {
  getMapPlaces as getMapPlacesEndpoint,
  getDetail as getPlaceDetailEndpoint,
  getRecentPlaces as getRecentPlacesEndpoint,
  type MapPlaceResponse,
  type PlacePostResponse,
  type RecentPlaceResponse,
  unwrapApiResponse,
  updateBookmark as updateBookmarkEndpoint,
} from '@/shared/api';
import type { MapBounds, MapPin, PlaceDetail, PlaceDetailPost, RecentPlace } from '../types';

function toMapPin(dto: MapPlaceResponse): MapPin {
  return { id: dto.id, lat: dto.latitude, lng: dto.longitude };
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
    title: dto.title || dto.memo || '제목 없는 게시물',
    authorHandle: dto.authorIdentifier ?? undefined,
    thumbnail: dto.representativeMedia?.url,
    memo: dto.memo ?? undefined,
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
    posts: (response.posts?.items ?? []).map(toPlaceDetailPost),
  };
}

export async function updatePlaceBookmark(placeId: number, bookmarked: boolean): Promise<void> {
  await updateBookmarkEndpoint(placeId, { bookmarked }, { auth: 'required' });
}
