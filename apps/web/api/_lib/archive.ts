import type { SharedArchiveMeta } from './og';

/** `GET /api/public/v1/groups/{token}` 응답 중 OG 태그에 필요한 부분만 — 전체 스키마는 orval 생성물을 참고. */
interface GroupApiEnvelope {
  resultType?: string;
  success?: {
    name: string;
    postCount: number;
    owner?: { nickname?: string | null } | null;
    thumbnailUrls?: string[];
  };
}

/**
 * 공유 아카이브의 OG 태그용 메타 — 인증 없는 공개 API 라 서버 함수에서 바로 부른다.
 * 무효 토큰(404)·API 실패·네트워크 오류 어느 쪽이든 던지지 않고 null 을 돌려준다 —
 * 이 함수의 실패가 공유 페이지 자체를 못 열게 만들면 안 된다(호출부가 기본 태그로 대체).
 */
export async function fetchSharedArchiveMeta(
  apiBaseUrl: string,
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SharedArchiveMeta | null> {
  try {
    const response = await fetchImpl(
      `${apiBaseUrl}/api/public/v1/groups/${encodeURIComponent(token)}`,
    );
    if (!response.ok) return null;

    const body = (await response.json()) as GroupApiEnvelope;
    if (body.resultType !== 'SUCCESS' || !body.success) return null;

    const data = body.success;
    return {
      name: data.name,
      ownerNickname: data.owner?.nickname ?? undefined,
      postCount: data.postCount,
      thumbnailUrl: data.thumbnailUrls?.[0],
    };
  } catch {
    return null;
  }
}
