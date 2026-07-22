import {
  type NativeToWebMessage,
  NativeToWebSchema,
  type Platform,
  type WebToNativeMessage,
  webReady,
} from './contract';

declare global {
  interface Window {
    // iOS WKWebView: 셸이 등록한 message handler
    webkit?: {
      messageHandlers?: Record<string, { postMessage: (msg: unknown) => void }>;
    };
    // Android WebView: 셸이 addJavascriptInterface 로 주입한 객체
    NookNative?: { postMessage: (json: string) => void };
    // 네이티브 → 웹: 셸이 evaluateJavaScript 로 호출하는 진입점
    __nookReceive?: (json: string) => void;
  }
}

function detectPlatform(): Platform {
  if (window.webkit?.messageHandlers?.nook) return 'ios';
  if (window.NookNative) return 'android';
  return 'web';
}

type Handler = (message: NativeToWebMessage) => void;

/**
 * 웹측 네이티브 브리지. WebView 가 못 하는 것(위치·외부링크·back·공유핸드오프)만 셸에 위임한다.
 * 일반 브라우저(platform=web)에선 전송이 no-op → 데스크톱 웹 폴백.
 */
class NativeBridge {
  readonly platform: Platform = detectPlatform();
  private handlers = new Set<Handler>();
  private started = false;
  // 핸들러 등록 전 도착분 버퍼(레이스 방지)
  private buffer: NativeToWebMessage[] = [];

  get isNative(): boolean {
    return this.platform !== 'web';
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    window.__nookReceive = (json: string) => this.receive(json);
    this.send(webReady());
  }

  on(handler: Handler): () => void {
    this.handlers.add(handler);
    if (this.buffer.length > 0) {
      const pending = this.buffer;
      this.buffer = [];
      for (const message of pending) handler(message);
    }
    return () => this.handlers.delete(handler);
  }

  send(message: WebToNativeMessage): void {
    switch (this.platform) {
      case 'ios':
        window.webkit?.messageHandlers?.nook?.postMessage(message);
        break;
      case 'android':
        window.NookNative?.postMessage(JSON.stringify(message));
        break;
      default:
        if (import.meta.env.DEV) console.debug('[bridge] (web no-op) =>', message.type, message);
    }
  }

  private receive(json: string): void {
    let data: unknown;
    try {
      data = JSON.parse(json);
    } catch {
      return;
    }
    const parsed = NativeToWebSchema.safeParse(data);
    if (!parsed.success) {
      if (import.meta.env.DEV)
        console.debug('[bridge] invalid native message', parsed.error.message);
      return;
    }
    if (this.handlers.size === 0) {
      this.buffer.push(parsed.data);
      return;
    }
    for (const handler of this.handlers) handler(parsed.data);
  }
}

export const nativeBridge = new NativeBridge();
