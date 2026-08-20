import {
  type CreateGroupRequestColor,
  connectPlace,
  disconnectPlace as disconnectPlaceEndpoint,
  findPlaceParsing,
  getSavedPostDetail,
  type PlaceResponse,
  type PlaceSearchResponse,
  type SavedPostDetailResponse,
  type SavedPostGroupResponse,
  searchPlaces,
  unwrapApiResponse,
  updateBookmark,
  updateMemo,
} from '@/shared/api';
import { type Coordinates, formatDistanceFromMeters } from '@/shared/lib/geolocation';
import type { ArchiveColor } from '@/shared/ui';
import type {
  ParsedPlace,
  PlaceParsingResult,
  PostArchive,
  PostDetail,
  SearchedPlace,
} from '../types';

/**
 * 게시물 도메인 BE 호출. 응답은 공통 envelope(`resultType`/`success`/`error`)로
 * 감싸져 오므로 `unwrapApiResponse` 로 풀어 features 코드에는 성공 페이로드만 흘려보낸다.
 */

/**
 * 서버 색상 코드 ↔ 디자인 토큰 색상. `features/archive/api`의 매핑과 동일한 서버 enum이라
 * 값도 그대로 맞춘다 — 각 feature가 자기 진입점을 소유하는 컨벤션이라 여기서 다시 둔다.
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

/**
 * 원본 URL 호스트 → 표기용 출처 이름. 서버 응답엔 출처(provider) 필드가 없어서
 * 게시물 원본 URL(`canonicalUrl`)의 호스트로만 판별한다 — 유입 경로가 늘어나면
 * 여기 한 줄씩 추가한다(호스트 추측은 하지 않는다, `blog.naver.co.kr` 같은 도메인에서
 * 엉뚱한 조각이 잡힌다).
 */
const SOURCE_NAME_BY_HOST: Record<string, string> = {
  'instagram.com': 'instagram',
};

function toSourceName(canonicalUrl?: string | null): string | undefined {
  if (!canonicalUrl) return undefined;
  try {
    const host = new URL(canonicalUrl).hostname.replace(/^(www|m)\./, '');
    return SOURCE_NAME_BY_HOST[host] ?? host;
  } catch {
    return undefined;
  }
}

/**
 * 계정 식별자 → 시안 표기(`@nook.official on instagram`).
 * 서버는 계정명만 내려주므로 `@` 와 출처를 여기서 붙인다.
 * 출처를 알 수 없으면(원본 URL 이 없거나 못 읽으면) 지어내지 않고 `@계정명` 까지만 쓴다.
 */
export function formatAuthorHandle(identifier?: string | null, canonicalUrl?: string | null) {
  const name = identifier?.trim().replace(/^@/, '');
  if (!name) return '';

  const source = toSourceName(canonicalUrl);
  return source ? `@${name} on ${source}` : `@${name}`;
}

function toPostArchive(dto: SavedPostGroupResponse): PostArchive {
  return {
    id: dto.id,
    name: dto.name,
    color: SERVER_TO_UI_COLOR[dto.color as CreateGroupRequestColor] ?? 'cement',
  };
}

/** 서버 DTO → 화면 모델. `media` 는 순서(`sequence`)대로 정렬하고 이미지만 쓴다(영상은 시안 미정). */
export function toPostDetail(dto: SavedPostDetailResponse): PostDetail {
  const images = [...dto.media]
    .filter((media) => media.type === 'IMAGE')
    .sort((a, b) => a.sequence - b.sequence)
    .map((media) => media.url);

  return {
    processingStatus: dto.processingStatus,
    processingPercent: dto.processingPercent,
    archives: dto.groups.map(toPostArchive),
    // 처리 중엔 title 이 비어 있을 수 있다 — archive 의 게시물 카드와 동일한 fallback 규칙.
    title: dto.title || dto.memo || '제목 없는 게시물',
    memo: dto.memo ?? undefined,
    // `SavedPostPlaceResponse` 는 `PlaceResponse` + sequence 라 같은 변환을 쓴다.
    places: dto.places.map(toParsedPlace),
    placeParsingStatus: dto.placeParsingStatus,
    placeParsingFailureReason: dto.placeParsingFailureReason ?? null,
    post: {
      id: String(dto.postId),
      authorHandle: formatAuthorHandle(dto.authorIdentifier, dto.canonicalUrl),
      caption: dto.body ?? undefined,
      images,
      originalUrl: dto.canonicalUrl,
    },
  };
}

/** `GET /api/v1/posts/{postId}` — 저장 게시물 상세 조회. */
export async function fetchPostDetail(postId: number): Promise<PostDetail> {
  const dto = unwrapApiResponse(await getSavedPostDetail(postId, { auth: 'required' }));
  if (!dto) throw new Error('게시물 상세 응답이 비어 있습니다.');
  return toPostDetail(dto);
}

/** 서버 응답을 그대로 옮긴다 — category·thumbnailUrl 만 null → undefined 로 좁힌다. */
function toParsedPlace(dto: PlaceResponse): ParsedPlace {
  return {
    id: dto.id,
    provider: dto.provider,
    externalPlaceId: dto.externalPlaceId,
    name: dto.name,
    address: dto.address,
    latitude: dto.latitude,
    longitude: dto.longitude,
    category: dto.category ?? undefined,
    phoneNumber: dto.phoneNumber ?? null,
    bookmarked: dto.bookmarked,
    thumbnail: dto.thumbnailUrl ?? undefined,
    thumbnailParsingStatus: dto.thumbnailParsingStatus,
  };
}

/** `GET /api/v1/posts/{postId}/place-parsing` — 게시물 연관 장소 파싱 결과 조회. */
export async function fetchPlaceParsing(postId: number): Promise<PlaceParsingResult> {
  const dto = unwrapApiResponse(await findPlaceParsing(postId, { auth: 'required' }));
  if (!dto) throw new Error('연관 장소 파싱 응답이 비어 있습니다.');

  return {
    postId: dto.postId,
    placeParsingStatus: dto.placeParsingStatus,
    failureReason: dto.failureReason ?? null,
    places: (dto.places ?? []).map(toParsedPlace),
  };
}

/** 서버 검색 DTO → 화면 모델. 식별은 selectionToken 으로만 한다(`SearchedPlace` 주석 참고). */
export function toSearchedPlace(dto: PlaceSearchResponse): SearchedPlace {
  return {
    id: dto.selectionToken,
    selectionToken: dto.selectionToken,
    name: dto.name,
    category: dto.category ?? '',
    address: dto.address,
    distance: dto.distanceMeters != null ? formatDistanceFromMeters(dto.distanceMeters) : undefined,
    latitude: dto.latitude,
    longitude: dto.longitude,
  };
}

/**
 * `GET /api/v1/places/search` — 직접 연결할 장소 검색.
 * 페이지당 상한(15)까지 첫 페이지만 가져온다 — 장소명 검색에서 그 밖까지 내려가는
 * 일이 드물어 페이지네이션 UI 는 두지 않았다. 좌표를 주면 서버가 거리를 계산해준다
 * (없으면 `distanceMeters` 가 비어 거리 표기를 생략한다).
 */
export async function searchConnectablePlaces(
  query: string,
  coords: Coordinates | null,
): Promise<SearchedPlace[]> {
  const dto = unwrapApiResponse(
    await searchPlaces(
      {
        query,
        size: 15,
        ...(coords ? { latitude: coords.lat, longitude: coords.lng } : {}),
      },
      { auth: 'required' },
    ),
  );
  return (dto?.items ?? []).map(toSearchedPlace);
}

/** `POST /api/v1/posts/{postId}/places` — 저장 게시물에 장소 직접 연결. 발급된 실 placeId 를 반환한다. */
export async function connectPostPlace(postId: number, selectionToken: string): Promise<number> {
  const dto = unwrapApiResponse(
    await connectPlace(postId, { selectionToken }, { auth: 'required' }),
  );
  if (!dto) throw new Error('장소 연결 응답이 비어 있습니다.');
  return dto.placeId;
}

/** `PATCH /api/v1/posts/{postId}/memo` — 저장 게시물 메모 변경. 빈 문자열은 삭제(null)로 보낸다. */
export async function updatePostMemo(postId: number, memo: string): Promise<void> {
  const trimmed = memo.trim();
  await updateMemo(postId, { memo: trimmed.length > 0 ? trimmed : null }, { auth: 'required' });
}

/**
 * `PATCH /api/v1/places/{placeId}/bookmark` — 연관 장소 북마크 변경.
 * 장소 도메인 엔드포인트지만(`features/map/api` 와 동일 호출) 각 feature 가 자기
 * 진입점을 소유한다 — 테스트가 feature api 모듈 단위로 모킹하는 컨벤션 때문이다.
 */
export async function updatePlaceBookmark(placeId: number, bookmarked: boolean): Promise<void> {
  await updateBookmark(placeId, { bookmarked }, { auth: 'required' });
}

/**
 * `DELETE /api/v1/posts/{postId}/places/{placeId}` — 저장 게시물의 장소 연결 삭제.
 * 화면에서 말하는 "장소 삭제"가 이것이다 — 장소 자체가 아니라 이 사용자의 게시물↔장소
 * 연결을 끊는다.
 */
export async function disconnectPostPlace(postId: number, placeId: number): Promise<void> {
  await disconnectPlaceEndpoint(postId, placeId, { auth: 'required' });
}
