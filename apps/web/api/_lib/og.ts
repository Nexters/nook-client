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
  const owner = archive.ownerNickname ? `${archive.ownerNickname}님의 ` : '';
  return `${owner}아카이브 · ${archive.postCount}개 저장`;
}

/**
 * 빌드된 `index.html`(전역 기본 og:* 를 담고 있다)을 받아, 공유 아카이브 기준으로
 * 제목·설명·이미지·url 을 다시 쓴다. archive 가 null(무효 토큰·조회 실패)이면 제목·설명은
 * 기본값을 그대로 두고, 이미지·url 만 채운다 — 실패해도 og:image·og:url 은 항상 이
 * 공유 링크에 맞는 절대 URL이어야 하기 때문이다.
 */
export function renderSharedArchiveHtml(html: string, options: RenderOptions): string {
  const { archive, shareUrl, fallbackImageUrl } = options;

  let result = html;
  if (archive) {
    result = setTitle(result, `${archive.name} - nook`);
    result = setMetaContent(result, 'og:title', `${archive.name} - nook`);
    result = setMetaContent(result, 'og:description', toDescription(archive));
  }
  result = setMetaContent(result, 'og:image', archive?.thumbnailUrl ?? fallbackImageUrl);
  result = setMetaContent(result, 'og:url', shareUrl);

  return result;
}
