/** 공유 아카이브 상세 조회(`GET /api/public/v1/groups/{token}`)에서 OG 태그에 쓰는 부분만 뽑은 형태. */
export interface SharedArchiveMeta {
  name: string;
  ownerNickname?: string;
  postCount: number;
  thumbnailUrl?: string;
}

interface RenderOptions {
  /** null 이면 토큰이 무효(삭제·만료)하거나 조회에 실패한 경우다. */
  archive: SharedArchiveMeta | null;
  /** 이 공유 링크의 정규 URL — 항상 og:url 로 채운다. */
  shareUrl: string;
  /** 아카이브에 썸네일이 없거나 archive 가 null 일 때 쓰는 대체 이미지(절대 URL). */
  fallbackImageUrl: string;
}

/** `<title>`·`<meta property="og:...">` 값 안에 들어갈 텍스트를 HTML 로부터 안전하게 만든다. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function setMetaContent(html: string, property: string, content: string): string {
  const pattern = new RegExp(`(<meta\\s+property="${property}"\\s+content=)"[^"]*"`);
  return html.replace(pattern, `$1"${escapeHtml(content)}"`);
}

function setTitle(html: string, title: string): string {
  return html.replace(/<title>.*?<\/title>/s, `<title>${escapeHtml(title)}</title>`);
}

function toDescription(archive: SharedArchiveMeta): string {
  const owner = archive.ownerNickname ? `@${archive.ownerNickname} · ` : '';
  return `${owner}${archive.postCount} Places`;
}

/** OG 태그로 다시 쓸 값 — 공유 종류(아카이브·게시물)마다 조회 결과에서 만든다. */
export interface OgMeta {
  title: string;
  description: string;
  imageUrl?: string;
}

export function archiveOgMeta(archive: SharedArchiveMeta): OgMeta {
  return {
    title: archive.name,
    description: toDescription(archive),
    imageUrl: archive.thumbnailUrl,
  };
}

/**
 * 빌드된 `index.html`(전역 기본 og:* 를 담고 있다)을 받아, 공유 대상 기준으로
 * 제목·설명·이미지·url 을 다시 쓴다. meta 가 null(무효 토큰·조회 실패)이면 제목·설명은
 * 기본값을 그대로 두고, 이미지·url 만 채운다 — 실패해도 og:image·og:url 은 항상 이
 * 공유 링크에 맞는 절대 URL이어야 하기 때문이다.
 */
export function renderShareOgHtml(
  html: string,
  options: { meta: OgMeta | null; shareUrl: string; fallbackImageUrl: string },
): string {
  const { meta, shareUrl, fallbackImageUrl } = options;

  let result = html;
  if (meta) {
    result = setTitle(result, `${meta.title} - Nook`);
    result = setMetaContent(result, 'og:title', `${meta.title} - Nook`);
    result = setMetaContent(result, 'og:description', meta.description);
  }
  result = setMetaContent(result, 'og:image', meta?.imageUrl ?? fallbackImageUrl);
  result = setMetaContent(result, 'og:url', shareUrl);

  return result;
}

export function renderSharedArchiveHtml(html: string, options: RenderOptions): string {
  const { archive, ...rest } = options;
  return renderShareOgHtml(html, { meta: archive ? archiveOgMeta(archive) : null, ...rest });
}
