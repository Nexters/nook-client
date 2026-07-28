import { apiFetch } from '@/shared/api/http';

/**
 * 게시물 도메인 BE 호출. 응답은 공통 envelope(`resultType`/`success`/`error`)로
 * 감싸져 오므로 여기서 unwrap 해서 features 코드에는 성공 페이로드만 흘려보낸다.
 */

interface ApiEnvelope<T> {
  /** 'SUCCESS' 외의 실패 값은 아직 스펙 미확정 — 'SUCCESS' 가 아니면 전부 실패로 본다. */
  resultType: string;
  success: T | null;
  error: { errorCode: string; reason: string; data?: unknown } | null;
}

/** 명세 예시엔 PENDING 만 있다 — SUCCESS/FAILED 는 가정값이라 실제 enum 확정 시 여기만 고친다. */
export type PlaceParsingStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface ParsedPlace {
  id: number;
  provider: string;
  externalPlaceId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category: string;
  phoneNumber: string | null;
  bookmarked: boolean;
}

export interface PlaceParsingResult {
  postId: number;
  placeParsingStatus: PlaceParsingStatus;
  failureReason: string | null;
  places: ParsedPlace[];
}

function unwrap<T>(envelope: ApiEnvelope<T>, path: string): T {
  if (envelope.resultType !== 'SUCCESS' || envelope.success === null) {
    throw new Error(envelope.error?.reason ?? `요청 실패: ${path}`);
  }
  return envelope.success;
}

/** `GET /api/v1/posts/{postId}/place-parsing` — 게시물 연관 장소 파싱 결과 조회. */
export async function fetchPlaceParsing(postId: string): Promise<PlaceParsingResult> {
  const path = `/api/v1/posts/${encodeURIComponent(postId)}/place-parsing`;
  return unwrap(await apiFetch<ApiEnvelope<PlaceParsingResult>>(path), path);
}
