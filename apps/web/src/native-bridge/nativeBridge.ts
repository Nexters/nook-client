import {
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
    __nookReceive?: (json: string) => void;
  }
}

type Handler = (message: NativeToWeb) => void;
type SessionResult = Extract<NativeToWeb, { type: 'SESSION_RESULT' }>['payload'];
type SocialLoginResult = Extract<NativeToWeb, { type: 'SOCIAL_LOGIN_RESULT' }>['payload'];

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

class NativeBridge {
  readonly platform: Platform = detectPlatform();
  private handlers = new Set<Handler>();
  private buffer: NativeToWeb[] = [];
  private started = false;
  private pending = new Map<string, (result: SessionResult) => void>();
  private pendingSocial = new Map<string, (result: SocialLoginResult) => void>();

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
    if (message.type === 'SESSION_RESULT') {
      const resolve = this.pending.get(message.payload.requestId);
      if (resolve) {
        this.pending.delete(message.payload.requestId);
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
