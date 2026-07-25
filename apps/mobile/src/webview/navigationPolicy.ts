import { URL } from 'react-native-url-polyfill';

const EXTERNAL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);

export type NavigationDecision = 'allow' | 'open-external' | 'block';

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function resolveHttpOrigin(value: string): string {
  const url = parseUrl(value);
  if (!url || (url.protocol !== 'http:' && url.protocol !== 'https:') || url.origin === 'null') {
    throw new Error(`EXPO_PUBLIC_WEB_URL 은 http(s) URL 이어야 한다: ${value}`);
  }
  return url.origin;
}

export function isTrustedUrl(value: string, trustedOrigin: string): boolean {
  const origin = parseUrl(value)?.origin;
  return !!origin && origin !== 'null' && origin === trustedOrigin;
}

export function isOpenableExternalUrl(value: string): boolean {
  const url = parseUrl(value);
  return !!url && EXTERNAL_PROTOCOLS.has(url.protocol);
}

export function decideNavigation(
  value: string,
  trustedOrigin: string,
  isTopFrame = true,
): NavigationDecision {
  // react-native-webview 는 브리지 스크립트를 기본적으로 메인 프레임에만 주입한다.
  if (!isTopFrame || value === 'about:blank' || isTrustedUrl(value, trustedOrigin)) {
    return 'allow';
  }

  return isOpenableExternalUrl(value) ? 'open-external' : 'block';
}
