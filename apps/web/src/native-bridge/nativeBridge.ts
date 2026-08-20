import {
  type ImagePickSource,
  type NativeToWeb,
  type Platform,
  parseNativeToWeb,
  type SocialProvider,
  type WebToNative,
} from '@nook/bridge-contracts';

// RN(Expo) webview 셸용 브리지 클라이언트.
// - 웹→네이티브: window.ReactNativeWebView.postMessage(string) (react-native-webview 제공)
// - 네이티브→웹: window.__nookReceive(json) (셸이 injectJavaScript 로 호출)

interface ReactNativeWebView {
  postMessage: (data: string) => void;
}

declare global {
  interface Window {
    ReactNativeWebView?: ReactNativeWebView;
    __nookPlatform?: string;
    __nookAppVersion?: string;
    __nookReceive?: (json: string) => void;
  }
}

type Handler = (message: NativeToWeb) => void;
type SessionResult = Extract<NativeToWeb, { type: 'SESSION_RESULT' }>['payload'];
type SocialLoginResult = Extract<NativeToWeb, { type: 'SOCIAL_LOGIN_RESULT' }>['payload'];
type ImagePickResult = Extract<NativeToWeb, { type: 'IMAGE_PICK_RESULT' }>['payload'];
type PushPermissionResult = Extract<NativeToWeb, { type: 'PUSH_PERMISSION_RESULT' }>['payload'];

// crypto.randomUUID 는 보안 컨텍스트에서만 존재한다. 실기기가 http://<LAN IP> 의
// dev 서버를 볼 때는 비보안 컨텍스트라 undefined 다. 요청/응답 짝을 맞추는 용도라
// 암호학적 강도는 필요 없으므로 폴백을 둔다.
function randomRequestId(): string {
  const uuid = globalThis.crypto?.randomUUID;
  if (uuid) return uuid.call(globalThis.crypto);
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function detectPlatform(): Platform {
  if (window.ReactNativeWebView) {
    const p = window.__nookPlatform;
    return p === 'ios' || p === 'android' ? p : 'ios';
  }
  return 'web';
}

/** 셸이 심어준 앱 버전. 브라우저로 열었거나 구버전 셸이면 알 수 없다. */
function detectAppVersion(): string | null {
  return window.__nookAppVersion || null;
}

class NativeBridge {
  readonly platform: Platform = detectPlatform();
  /** app.json 의 version (예: "1.0.0"). 셸 밖에서는 null. */
  readonly appVersion: string | null = detectAppVersion();
  private handlers = new Set<Handler>();
  private buffer: NativeToWeb[] = [];
  private started = false;
  private pending = new Map<string, (result: SessionResult) => void>();
  private pendingSocial = new Map<string, (result: SocialLoginResult) => void>();
  private pendingImagePick = new Map<string, (result: ImagePickResult) => void>();
  private pendingPushPermission = new Map<string, (result: PushPermissionResult) => void>();

  get isNative(): boolean {
    return !!window.ReactNativeWebView;
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    window.__nookReceive = (json: string) => this.receive(json);
    this.send({ v: 1, type: 'WEB_READY', payload: {} });
  }

  on(handler: Handler): () => void {
    this.handlers.add(handler);
    if (this.buffer.length > 0) {
      const pending = this.buffer;
      this.buffer = [];
      for (const m of pending) handler(m);
    }
    return () => this.handlers.delete(handler);
  }

  send(message: WebToNative): void {
    window.ReactNativeWebView?.postMessage(JSON.stringify(message));
  }

  requestSession(type: 'SESSION_GET' | 'SESSION_CLEAR'): Promise<SessionResult>;
  requestSession(type: 'SESSION_REFRESH', revision: number): Promise<SessionResult>;
  requestSession(
    type: 'SESSION_ESTABLISH',
    accessToken: string,
    refreshToken: string | null,
  ): Promise<SessionResult>;
  requestSession(
    type: string,
    first?: number | string,
    second?: string | null,
  ): Promise<SessionResult> {
    const requestId = randomRequestId();
    const payload =
      type === 'SESSION_REFRESH'
        ? { requestId, revision: first as number }
        : type === 'SESSION_ESTABLISH'
          ? { requestId, accessToken: first as string, refreshToken: second ?? null }
          : { requestId };
    return new Promise((resolve) => {
      this.pending.set(requestId, resolve);
      this.send({ v: 1, type, payload } as WebToNative);
    });
  }

  /** 셸이 provider SDK 를 실행하고 자격증명만 돌려준다. 백엔드 인증은 호출부가 이어서 한다. */
  requestSocialLogin(provider: SocialProvider): Promise<SocialLoginResult> {
    const requestId = randomRequestId();
    return new Promise((resolve) => {
      this.pendingSocial.set(requestId, resolve);
      this.send({ v: 1, type: 'SOCIAL_LOGIN', payload: { requestId, provider } });
    });
  }

  /** 셸이 앨범/카메라를 열어 이미지를 base64 로 돌려준다. 업로드와 저장은 호출부가 이어서 한다. */
  requestImagePick(source: ImagePickSource): Promise<ImagePickResult> {
    const requestId = randomRequestId();
    return new Promise((resolve) => {
      this.pendingImagePick.set(requestId, resolve);
      this.send({ v: 1, type: 'IMAGE_PICK', payload: { requestId, source } });
    });
  }

  /**
   * 셸이 알림 권한을 요청하고, 허용되면 FCM/APNs 토큰을 함께 돌려준다. 이미 허용/거부가
   * 결정된 상태에서 다시 불러도 안전하다 — OS 가 다이얼로그 없이 현재 상태만 돌려준다.
   */
  requestPushPermission(): Promise<PushPermissionResult> {
    const requestId = randomRequestId();
    return new Promise((resolve) => {
      this.pendingPushPermission.set(requestId, resolve);
      this.send({ v: 1, type: 'REQUEST_PUSH_PERMISSION', payload: { requestId } });
    });
  }

  private receive(json: string): void {
    const message = parseNativeToWeb(json);
    if (!message) {
      return;
    }
    if (message.type === 'SOCIAL_LOGIN_RESULT') {
      const resolve = this.pendingSocial.get(message.payload.requestId);
      if (resolve) {
        this.pendingSocial.delete(message.payload.requestId);
        resolve(message.payload);
      }
    }
    if (message.type === 'IMAGE_PICK_RESULT') {
      const resolve = this.pendingImagePick.get(message.payload.requestId);
      if (resolve) {
        this.pendingImagePick.delete(message.payload.requestId);
        resolve(message.payload);
      }
    }
    if (message.type === 'SESSION_RESULT') {
      const resolve = this.pending.get(message.payload.requestId);
      if (resolve) {
        this.pending.delete(message.payload.requestId);
        resolve(message.payload);
      }
    }
    if (message.type === 'PUSH_PERMISSION_RESULT') {
      const resolve = this.pendingPushPermission.get(message.payload.requestId);
      if (resolve) {
        this.pendingPushPermission.delete(message.payload.requestId);
        resolve(message.payload);
      }
    }
    if (this.handlers.size === 0) {
      this.buffer.push(message);
      return;
    }
    for (const handler of this.handlers) handler(message);
  }
}

export const nativeBridge = new NativeBridge();
