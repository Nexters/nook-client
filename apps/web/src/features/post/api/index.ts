import {
  type CreateGroupRequestColor,
  findPlaceParsing,
  getSavedPostDetail,
  type PlaceResponse,
  type SavedPostDetailResponse,
  type SavedPostGroupResponse,
  unwrapApiResponse,
  updateBookmark,
  updateMemo,
} from '@/shared/api';
import type { GroupColor } from '@/shared/ui';
import type { ParsedPlace, PlaceParsingResult, PostDetail, PostGroup } from '../types';

/**
 * 게시물 도메인 BE 호출. 응답은 공통 envelope(`resultType`/`success`/`error`)로
 * 감싸져 오므로 `unwrapApiResponse` 로 풀어 features 코드에는 성공 페이로드만 흘려보낸다.
 */

/**
 * 서버 색상 코드 ↔ 디자인 토큰 색상. `features/group/api`의 매핑과 동일한 서버 enum이라
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
} as const satisfies Record<CreateGroupRequestColor, GroupColor>;

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

function toPostGroup(dto: SavedPostGroupResponse): PostGroup {
  return {
    id: dto.id,
    name: dto.name,
    color: SERVER_TO_UI_COLOR[dto.color as CreateGroupRequestColor] ?? 'cement',
  };
}

/** 서버 DTO → 화면 모델. `media` 는 순서(`sequence`)대로 정렬하고 이미지만 쓴다(영상은 시안 미정). */
function toPostDetail(dto: SavedPostDetailResponse): PostDetail {
  const images = [...dto.media]
    .filter((media) => media.type === 'IMAGE')
    .sort((a, b) => a.sequence - b.sequence)
    .map((media) => media.url);

  return {
    processingStatus: dto.processingStatus,
    groups: dto.groups.map(toPostGroup),
    // 처리 중엔 title 이 비어 있을 수 있다 — group 의 게시물 카드와 동일한 fallback 규칙.
    title: dto.title || dto.memo || '제목 없는 게시물',
    memo: dto.memo ?? undefined,
    // `SavedPostPlaceResponse` 는 `PlaceResponse` + sequence 라 같은 변환을 쓴다.
    places: dto.places.map(toParsedPlace),
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

/** 서버 응답을 그대로 옮긴다 — category 만 null → undefined 로 좁힌다. */
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
