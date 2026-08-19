import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchSharedArchiveMeta } from './_lib/archive.js';
import { BASE_HTML } from './_lib/baseHtml.generated.js';
import { renderSharedArchiveHtml } from './_lib/og.js';

/**
 * `/shared/:token` 을 가로채는 Vercel Function(`vercel.json` rewrite) — 카카오·슬랙
 * 크롤러는 JS 를 실행하지 않아 SPA 가 그리는 og:* 를 못 보므로, 여기서 아카이브 이름·
 * 썸네일로 다시 쓴 정적 HTML 을 내려준다. 실제 사용자가 열어도 같은 HTML 이 그대로
 * SPA 를 부팅해 평소와 똑같이 보인다.
 *
 * 아카이브 조회가 실패해도(무효 토큰·API 다운) 절대 500 을 내지 않고 기본 태그로
 * 대체한다 — 이 함수의 실패가 공유 페이지 진입 자체를 막으면 안 된다.
 *
 * `BASE_HTML`(og:* 기본값을 담은 `index.html`)은 빌드 시점에 문자열로 구워
 * 함수 번들 안에 직접 박아 넣는다(`scripts/generate-base-html.mjs`). 예전엔 런타임에
 * `dist/index.html` 을 파일로 읽었는데, `vercel.json` 의 `includeFiles` 매핑이 실제
 * 배포된 Lambda 안에서 기대한 경로에 파일을 놓아주지 않아 조용히 실패했다(항상
 * `/` 로 리다이렉트 폴백을 타 og:* 가 아예 아카이브 기준으로 안 바뀌었다). 문자열을
 * 번들에 직접 넣으면 그 실패 경로 자체가 사라진다.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  const host = req.headers.host;
  const shareUrl = `https://${host}/shared/${token}`;
  const fallbackImageUrl = `https://${host}/og-default.png`;
  const apiBaseUrl = process.env.API_BASE_URL;

  const archive = apiBaseUrl && token ? await fetchSharedArchiveMeta(apiBaseUrl, token) : null;
  const html = renderSharedArchiveHtml(BASE_HTML, { archive, shareUrl, fallbackImageUrl });

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // 크롤러 재조회 빈도가 낮아 CDN 에 잠깐 캐시해도 무방하다 — 매 공유 클릭마다
  // 아카이브 API 를 다시 부르지 않게 한다.
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600');
  res.status(200).send(html);
}
