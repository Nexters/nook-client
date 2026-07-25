import { parseWebToNative } from '@nook/bridge-contracts';
import { useCallback } from 'react';
import { Linking, Platform } from 'react-native';
import type { WebViewMessageEvent } from 'react-native-webview';
import {
  decideNavigation,
  isOpenableExternalUrl,
  isTrustedUrl,
  resolveHttpOrigin,
} from '../webview/navigationPolicy';

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL;
if (!WEB_URL) {
  throw new Error('EXPO_PUBLIC_WEB_URL 미설정');
}

const WEB_ORIGIN = resolveHttpOrigin(WEB_URL);
const INJECT_BEFORE = `window.__nookPlatform = ${JSON.stringify(Platform.OS)}; true;`;

interface NavigationRequest {
  url: string;
  isTopFrame?: boolean;
}

function openExternal(url: string): void {
  Linking.openURL(url).catch(() => undefined);
}

export function useWebViewBridge() {
  const onMessage = useCallback((event: WebViewMessageEvent) => {
    if (!isTrustedUrl(event.nativeEvent.url, WEB_ORIGIN)) {
      return;
    }

    const message = parseWebToNative(event.nativeEvent.data);
    if (!message) {
      return;
    }

    switch (message.type) {
      case 'OPEN_EXTERNAL_URL': {
        if (isOpenableExternalUrl(message.payload.url)) {
          openExternal(message.payload.url);
        }
        break;
      }
      default:
        break;
    }
  }, []);

  const onShouldStartLoadWithRequest = useCallback((request: NavigationRequest) => {
    const decision = decideNavigation(request.url, WEB_ORIGIN, request.isTopFrame ?? true);
    if (decision === 'open-external') {
      openExternal(request.url);
    }
    return decision === 'allow';
  }, []);

  return {
    injectedJavaScript: INJECT_BEFORE,
    onMessage,
    onShouldStartLoadWithRequest,
    webUrl: WEB_URL,
  } as const;
}
