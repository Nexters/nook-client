import { URL } from 'react-native-url-polyfill';

const APP_SCHEMES = new Set(['com.nook.app:', 'com.nook.app.dev:', 'kr.com.nook.app.dev:']);
const POST_ID = /^\d+$/;

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

/**
 * 본앱 딥링크를 WebView의 허용된 화면으로만 변환한다.
 * 임의의 외부 URL을 source로 넘기지 않도록 라우트를 명시적으로 제한한다.
 */
export function resolveAppLinkWebUrl(appLink: string, webBaseUrl: string): string | null {
  const url = parseUrl(appLink);
  if (!url || !APP_SCHEMES.has(url.protocol) || url.search || url.hash) {
    return null;
  }

  const segments = [url.hostname, ...url.pathname.split('/')].filter(Boolean);
  let webPath: string | null = null;

  if (segments.length === 1 && segments[0] === 'login') {
    webPath = '/login';
  } else if (segments.length === 2 && segments[0] === 'post' && POST_ID.test(segments[1])) {
    // 네이티브의 게시글 딥링크는 공유 확장의 "앱에서 보기" 진입이다.
    // 웹이 일반 페이지 진입과 구분해 뒤로가기 목적지를 결정할 수 있도록 출처를 남긴다.
    webPath = `/post/${segments[1]}?entry=share`;
  }

  if (!webPath) return null;

  try {
    return new URL(webPath, webBaseUrl).toString();
  } catch {
    return null;
  }
}
