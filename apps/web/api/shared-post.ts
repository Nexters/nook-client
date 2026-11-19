import type { VercelRequest, VercelResponse } from '@vercel/node';
import { BASE_HTML } from './_lib/baseHtml.generated.js';
import { renderShareOgHtml } from './_lib/og.js';
import { fetchPostShareOgMeta } from './_lib/postShare.js';

/**
 * `/shared-post/:token` 을 가로채는 Vercel Function — 게시물 공유판 `api/shared.ts`.
 * 크롤러용 og:* 를 게시물 제목·대표 이미지로 다시 쓴 HTML 을 내려주고, 사람이 열면 같은
 * HTML 이 SPA 를 부팅한다. 조회가 실패해도 500 대신 기본 태그로 대체한다.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  const host = req.headers.host;
  const shareUrl = `https://${host}/shared-post/${token}`;
  const fallbackImageUrl = `https://${host}/og-default.png`;
  const apiBaseUrl = process.env.API_BASE_URL;

  const meta = apiBaseUrl && token ? await fetchPostShareOgMeta(apiBaseUrl, token) : null;
  const html = renderShareOgHtml(BASE_HTML, { meta, shareUrl, fallbackImageUrl });

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600');
  res.status(200).send(html);
}
