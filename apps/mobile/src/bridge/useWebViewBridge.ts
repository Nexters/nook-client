import { parseWebToNative } from '@nook/bridge-contracts';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Linking, Platform } from 'react-native';
import type { WebView, WebViewMessageEvent } from 'react-native-webview';
import { runSocialLogin } from '../auth/socialLogin';
import { APP_VERSION, WEB_URL } from '../config/appConfig';
import { runImagePick } from '../media/imagePicker';
import {
  addNotificationOpenedListener,
  addPushTokenRefreshListener,
  getInitialNotificationOpened,
  getPushStatusAndToken,
  type PushNotificationOpened,
  requestPushPermissionAndToken,
} from '../notifications/pushNotifications';
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
// 값이 바뀌지 않는 셸 정보라 메시지 왕복 없이 로드 전에 심어둔다(플랫폼과 같은 취급).
const INJECT_BEFORE = [
  `window.__nookPlatform = ${JSON.stringify(Platform.OS)};`,
  `window.__nookAppVersion = ${JSON.stringify(APP_VERSION)};`,
  'true;',
].join(' ');

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
  // 웹이 WEB_READY 를 보낸 시점 = 원격 웹의 JS 가 실제로 실행됐다는 뜻. 스플래시를 내릴 기준이다.
  const [webReady, setWebReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  // iOS 엣지 스와이프 허용 여부 — 웹이 화면마다 알려준다(SET_BACK_GESTURE).
  // 기본값 true: 이 메시지를 보내지 않는 구버전 웹이 실려도 지금까지의 동작(항상 허용)이
  // 그대로 유지된다. 새 웹은 첫 화면을 그리면서 곧바로 제 값을 보내 덮어쓴다.
  const [backGestureEnabled, setBackGestureEnabled] = useState(true);
  const [webTarget, setWebTarget] = useState({ url: WEB_URL, revision: 0 });
  // 웹이 아직 준비되기 전(콜드 스타트로 알림을 탭한 경우 포함)에 들어온 오픈 이벤트는
  // 여기 잠깐 쥐고 있다가 WEB_READY 때 흘려보낸다.
  const pendingNotificationOpened = useRef<PushNotificationOpened | null>(null);

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
      getInitialNotificationOpened().catch(() => null),
    ]).then(([initialUrl, , initialNotificationOpened]) => {
      if (!active) return;
      if (!receivedRuntimeLink && initialUrl) applyAppLink(initialUrl);
      if (initialNotificationOpened) pendingNotificationOpened.current = initialNotificationOpened;
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

  // 앱이 이미 떠서 웹이 준비된 상태로 알림을 탭한 경우. 콜드 스타트 쪽은 부트스트랩 이펙트가 맡는다.
  useEffect(() => {
    const subscription = addNotificationOpenedListener((opened) => {
      if (webReady) {
        send({ v: 1, type: 'PUSH_NOTIFICATION_OPENED', payload: opened });
      } else {
        pendingNotificationOpened.current = opened;
      }
    });
    return () => subscription.remove();
  }, [webReady, send]);

  // 재설치·복원 등으로 FCM 토큰이 재발급된 경우. 요청 없이 오는 이벤트라 바로 흘려보낸다.
  useEffect(() => {
    return addPushTokenRefreshListener((token) => {
      send({ v: 1, type: 'PUSH_TOKEN_REFRESHED', payload: { token } });
    });
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
          setWebReady(true);
          setLoadFailed(false);
          void restoreSession().then((session) => sendResult('web-ready', session));
          if (pendingNotificationOpened.current) {
            send({
              v: 1,
              type: 'PUSH_NOTIFICATION_OPENED',
              payload: pendingNotificationOpened.current,
            });
            pendingNotificationOpened.current = null;
          }
          break;
        case 'REQUEST_PUSH_PERMISSION': {
          const { requestId } = message.payload;
          void requestPushPermissionAndToken().then((outcome) => {
            send({ v: 1, type: 'PUSH_PERMISSION_RESULT', payload: { requestId, ...outcome } });
          });
          break;
        }
        case 'GET_PUSH_STATUS': {
          const { requestId } = message.payload;
          void getPushStatusAndToken().then((outcome) => {
            send({ v: 1, type: 'PUSH_PERMISSION_RESULT', payload: { requestId, ...outcome } });
          });
          break;
        }
        case 'SESSION_GET':
          void restoreSession(message.payload.apiBaseUrl).then((session) =>
            sendResult(message.payload.requestId, session),
          );
          break;
        case 'SESSION_ESTABLISH':
          void establishSession(
            message.payload.accessToken,
            message.payload.refreshToken,
            message.payload.apiBaseUrl,
          ).then((session) => sendResult(message.payload.requestId, session));
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
        case 'SET_BACK_GESTURE':
          // 웹의 판정: "헤더 좌상단에 뒤로가기 버튼이 있는 풀 페이지인가". 드로어·바텀시트·
          // 메인 탭에서는 false 로 내려와 제스처가 아예 인식되지 않는다.
          setBackGestureEnabled(message.payload.enabled);
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

  // 메인 프레임 로드가 실패했을 때만 오류 화면으로 간다. 하위 리소스 실패까지 전면 오류로
  // 덮으면 이미 뜬 화면이 통째로 사라진다.
  const onLoadFailed = useCallback(() => {
    setLoadFailed(true);
  }, []);

  // 실패한 WebView 는 reload() 가 듣지 않는 경우가 있어 key 를 바꿔 새로 마운트한다.
  const retryLoad = useCallback(() => {
    setLoadFailed(false);
    setWebReady(false);
    setWebTarget((current) => ({ ...current, revision: current.revision + 1 }));
  }, []);

  return {
    injectedJavaScript: INJECT_BEFORE,
    bootstrapped,
    webReady,
    loadFailed,
    onLoadFailed,
    retryLoad,
    onMessage,
    onShouldStartLoadWithRequest,
    backGestureEnabled,
    webUrl: webTarget.url,
    webViewKey: webTarget.revision,
    webViewRef,
  } as const;
}
