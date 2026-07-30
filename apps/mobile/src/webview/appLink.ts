import { URL } from 'react-native-url-polyfill';

const APP_SCHEMES = new Set(['com.nook.app:', 'com.nook.app.dev:']);
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
    webPath = `/post/${segments[1]}`;
  }

  if (!webPath) return null;

  try {
    return new URL(webPath, webBaseUrl).toString();
  } catch {
    return null;
  }
}
