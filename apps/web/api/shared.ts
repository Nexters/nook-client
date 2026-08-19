import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { VercelRequest, VercelResponse } from '@vercel/node';
// 이 함수는 ESM(`"type": "module"`)으로 실행되는데 Node ESM 은 확장자 생략을 허용하지
// 않는다 — 확장자를 빼면 배포 후 모듈 로드 시점에 ERR_MODULE_NOT_FOUND 로 함수 전체가
// 죽는다(FUNCTION_INVOCATION_FAILED). 컴파일 후 파일명 기준인 `.js` 를 반드시 유지할 것.
import { fetchSharedArchiveMeta } from './_lib/archive.js';
import { renderSharedArchiveHtml } from './_lib/og.js';

/**
 * `/shared/:token` 을 가로채는 Vercel Function(`vercel.json` rewrite) — 카카오·슬랙
 * 크롤러는 JS 를 실행하지 않아 SPA 가 그리는 og:* 를 못 보므로, 여기서 아카이브 이름·
 * 썸네일로 다시 쓴 정적 HTML 을 내려준다. 실제 사용자가 열어도 같은 HTML 이 그대로
 * SPA 를 부팅해 평소와 똑같이 보인다.
 *
 * 아카이브 조회가 실패해도(무효 토큰·API 다운) 절대 500 을 내지 않고 기본 태그로
 * 대체한다 — 이 함수의 실패가 공유 페이지 진입 자체를 막으면 안 된다.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  const host = req.headers.host;
  const shareUrl = `https://${host}/shared/${token}`;
  const fallbackImageUrl = `https://${host}/og-default.png`;
  const apiBaseUrl = process.env.API_BASE_URL;

  const baseHtml = readBaseHtml();
  if (!baseHtml) {
    // index.html 을 못 읽으면(빌드 설정 문제 등) og:* 를 채울 수 없다 — 같은 /shared/:token
    // 으로 되돌리면 이 함수가 또 불려 무한 루프가 되니, 함수가 안 끼는 경로로 보낸다.
    // 이 링크로 들어온 사람은 원하던 아카이브를 못 열지만, 크래시 화면보다는 낫다.
    res.redirect(307, '/');
    return;
  }

  const archive = apiBaseUrl && token ? await fetchSharedArchiveMeta(apiBaseUrl, token) : null;
  const html = renderSharedArchiveHtml(baseHtml, { archive, shareUrl, fallbackImageUrl });

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // 크롤러 재조회 빈도가 낮아 CDN 에 잠깐 캐시해도 무방하다 — 매 공유 클릭마다
  // 아카이브 API 를 다시 부르지 않게 한다.
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600');
  res.status(200).send(html);
}

/**
 * 빌드된 `index.html`(og:* 기본값을 담고 있다)을 이 함수 배포물에 직접 묶어(`vercel.json`
 * 의 `includeFiles`) 읽는다. 예전엔 자기 배포 도메인으로 다시 HTTP 요청(self-fetch)해서
 * 가져왔는데, 그 네트워크 호출이 실패하면(자기 자신을 부르는 요청이라 실패 양상이 다양하다)
 * 에러 처리가 없어 함수 전체가 죽었다(FUNCTION_INVOCATION_FAILED) — 파일을 직접 읽으면
 * 네트워크 왕복 자체가 없어 그 실패 경로가 통째로 사라진다.
 */
function readBaseHtml(): string | null {
  try {
    return readFileSync(join(process.cwd(), 'dist/index.html'), 'utf-8');
  } catch (error) {
    console.error('[api/shared] index.html 을 읽지 못했습니다', error);
    return null;
  }
}
