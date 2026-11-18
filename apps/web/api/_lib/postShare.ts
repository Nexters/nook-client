import type { OgMeta } from './og.js';

/** `GET /api/public/v1/post-shares/{token}` 응답 중 OG 태그에 필요한 부분만 — 전체 스키마는 orval 생성물을 참고. */
interface PostShareApiEnvelope {
  resultType?: string;
  success?: {
    post: {
      title?: string | null;
      media: { url: string; thumbnailUrl?: string | null; type: string; sequence: number }[];
      places: unknown[];
    };
  };
}

/**
 * 게시물 공유 링크의 OG 메타 — 공개 API 라 서버 함수에서 바로 부른다. 아카이브 쪽
 * (`fetchSharedArchiveMeta`)과 같이 어떤 실패에도 던지지 않고 null 을 돌려준다.
 * 대표 이미지는 첫 미디어 — 영상은 포스터가 있을 때만 쓴다(크롤러는 영상 URL 을 못 그린다).
 */
export async function fetchPostShareOgMeta(
  apiBaseUrl: string,
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OgMeta | null> {
  try {
    const response = await fetchImpl(
      `${apiBaseUrl}/api/public/v1/post-shares/${encodeURIComponent(token)}`,
    );
    if (!response.ok) return null;

    const body = (await response.json()) as PostShareApiEnvelope;
    if (body.resultType !== 'SUCCESS' || !body.success) return null;

    const { post } = body.success;
    const [first] = [...post.media].sort((a, b) => a.sequence - b.sequence);
    return {
      title: post.title || '제목 없는 게시물',
      description: `${post.places.length} Places`,
      imageUrl: first
        ? (first.thumbnailUrl ?? (first.type === 'IMAGE' ? first.url : undefined))
        : undefined,
    };
  } catch {
    return null;
  }
}
