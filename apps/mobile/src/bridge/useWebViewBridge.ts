import { parseWebToNative } from '@nook/bridge-contracts';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Linking, Platform } from 'react-native';
import type { WebView, WebViewMessageEvent } from 'react-native-webview';
import { runSocialLogin } from '../auth/socialLogin';
import { WEB_URL } from '../config/appConfig';
import { runImagePick } from '../media/imagePicker';
import {
  clearSession,
  establishSession,
  refreshSession,
  restoreSession,
} from '../session/sessionCoordinator';
import { resolveAppLinkWebUrl } from '../webview/appLink';
import {
  decideNavigation,
  isOpenableExternalUrl,
  isTrustedUrl,
  resolveHttpOrigin,
} from '../webview/navigationPolicy';

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
  const [webTarget, setWebTarget] = useState({ url: WEB_URL, revision: 0 });

  const applyAppLink = useCallback((appLink: string) => {
    const url = resolveAppLinkWebUrl(appLink, WEB_URL);
    if (!url) return false;

    // 같은 화면 딥링크를 다시 받아도 현재 WebView 내부 위치와 무관하게 확실히 이동한다.
    setWebTarget((current) => ({ url, revision: current.revision + 1 }));
    return true;
  }, []);

  useEffect(() => {
    let active = true;
    let receivedRuntimeLink = false;
    const subscription = Linking.addEventListener('url', ({ url }) => {
      receivedRuntimeLink = true;
      applyAppLink(url);
    });

    void Promise.all([
      Linking.getInitialURL().catch(() => null),
      restoreSession().catch(() => null),
    ]).then(([initialUrl]) => {
      if (!active) return;
      if (!receivedRuntimeLink && initialUrl) applyAppLink(initialUrl);
      setBootstrapped(true);
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, [applyAppLink]);

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

  // Android 하드웨어 뒤로가기는 웹에 위임한다. 웹이 오버레이 닫기·히스토리 뒤로를 판단하고,
  // 더 갈 곳이 없으면 BACK_EXHAUSTED 로 알려와 그때 OS 기본 동작(앱 내리기)을 한다.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      send({ v: 1, type: 'BACK_REQUESTED', payload: {} });
      return true;
    });
    return () => subscription.remove();
  }, [send]);

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
        case 'SOCIAL_LOGIN': {
          const { requestId, provider } = message.payload;
          void runSocialLogin(provider).then((outcome) => {
            send({
              v: 1,
              type: 'SOCIAL_LOGIN_RESULT',
              payload: { requestId, provider, ...outcome },
            });
          });
          break;
        }
        case 'IMAGE_PICK': {
          const { requestId, source } = message.payload;
          void runImagePick(source).then((outcome) => {
            send({
              v: 1,
              type: 'IMAGE_PICK_RESULT',
              payload: { requestId, source, ...outcome },
            });
          });
          break;
        }
        case 'BACK_EXHAUSTED':
          if (Platform.OS === 'android') BackHandler.exitApp();
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
    webUrl: webTarget.url,
    webViewKey: webTarget.revision,
    webViewRef,
  } as const;
}
