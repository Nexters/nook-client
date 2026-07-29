import {
  findPlaceParsing,
  getSavedPostDetail,
  type PlaceResponse,
  type SavedPostDetailResponse,
  unwrapApiResponse,
  updateMemo,
} from '@/shared/api';
import type { GroupColor } from '@/shared/ui';
import type { ParsedPlace, PlaceParsingResult, PostDetail } from '../types';

/**
 * 게시물 도메인 BE 호출. 응답은 공통 envelope(`resultType`/`success`/`error`)로
 * 감싸져 오므로 `unwrapApiResponse` 로 풀어 features 코드에는 성공 페이로드만 흘려보낸다.
 */

// TODO(api): SavedPostDetailResponse 에 그룹 필드가 아직 없다 — BE 에 필드 추가 요청 예정
// (요청 문구는 작업 완료 보고에 정리). 그 전까지는 화면이 비어 보이지 않도록 고정 값으로 채운다.
const MOCK_GROUP: { name: string; color: GroupColor } = { name: '카페', color: 'yellow' };

/** 서버 DTO → 화면 모델. `media` 는 순서(`sequence`)대로 정렬하고 이미지만 쓴다(영상은 시안 미정). */
function toPostDetail(dto: SavedPostDetailResponse): PostDetail {
  const images = [...dto.media]
    .filter((media) => media.type === 'IMAGE')
    .sort((a, b) => a.sequence - b.sequence)
    .map((media) => media.url);

  return {
    processingStatus: dto.processingStatus,
    groupName: MOCK_GROUP.name,
    groupColor: MOCK_GROUP.color,
    // 처리 중엔 title 이 비어 있을 수 있다 — group 의 게시물 카드와 동일한 fallback 규칙.
    title: dto.title || dto.memo || '제목 없는 게시물',
    memo: dto.memo ?? undefined,
    post: {
      id: String(dto.postId),
      authorHandle: dto.authorIdentifier ?? '',
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
