import { parseWebToNative } from '@nook/bridge-contracts';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Platform } from 'react-native';
import type { WebView, WebViewMessageEvent } from 'react-native-webview';
import {
  clearSession,
  establishSession,
  refreshSession,
  restoreSession,
} from '../session/sessionCoordinator';
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
  const webViewRef = useRef<WebView>(null);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    restoreSession().finally(() => setBootstrapped(true));
  }, []);

  const send = useCallback((message: object) => {
    const json = JSON.stringify(message).replaceAll('\\', '\\\\').replaceAll("'", "\\'");
    webViewRef.current?.injectJavaScript(`window.__nookReceive?.('${json}'); true;`);
  }, []);

  const sendResult = useCallback(
    (requestId: string, session: Awaited<ReturnType<typeof restoreSession>>) => {
      send({
        v: 1,
        type: 'SESSION_RESULT',
        payload: session
          ? {
              requestId,
              status: 'authenticated',
              accessToken: session.accessToken,
              revision: session.revision,
            }
          : { requestId, status: 'anonymous' },
      });
    },
    [send],
  );

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
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
        case 'WEB_READY':
          void restoreSession().then((session) => sendResult('web-ready', session));
          break;
        case 'SESSION_GET':
          void restoreSession().then((session) => sendResult(message.payload.requestId, session));
          break;
        case 'SESSION_ESTABLISH':
          void establishSession(message.payload.accessToken, message.payload.refreshToken).then(
            (session) => sendResult(message.payload.requestId, session),
          );
          break;
        case 'SESSION_REFRESH':
          void refreshSession(message.payload.revision).then((session) =>
            sendResult(message.payload.requestId, session),
          );
          break;
        case 'SESSION_CLEAR':
          void clearSession().then(() => {
            send({ v: 1, type: 'SESSION_CLEARED', payload: { reason: 'logout' } });
            sendResult(message.payload.requestId, null);
          });
          break;
        default:
          break;
      }
    },
    [send, sendResult],
  );

  const onShouldStartLoadWithRequest = useCallback((request: NavigationRequest) => {
    const decision = decideNavigation(request.url, WEB_ORIGIN, request.isTopFrame ?? true);
    if (decision === 'open-external') {
      openExternal(request.url);
    }
    return decision === 'allow';
  }, []);

  return {
    injectedJavaScript: INJECT_BEFORE,
    bootstrapped,
    onMessage,
    onShouldStartLoadWithRequest,
    webUrl: WEB_URL,
    webViewRef,
  } as const;
}
