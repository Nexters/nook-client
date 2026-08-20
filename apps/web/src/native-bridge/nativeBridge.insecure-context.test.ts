import { afterEach, describe, expect, it, vi } from 'vitest';
import { nativeBridge } from './nativeBridge';

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(window, 'ReactNativeWebView');
});

describe('비보안 컨텍스트(http://<LAN IP>)의 웹뷰', () => {
  it('crypto.randomUUID 가 없어도 세션 요청이 터지지 않는다', () => {
    // secure context 가 아니면 randomUUID 는 노출되지 않는다.
    vi.stubGlobal('crypto', { getRandomValues: globalThis.crypto.getRandomValues });
    const posted: string[] = [];
    window.ReactNativeWebView = { postMessage: (data: string) => posted.push(data) };

    expect(() => {
      void nativeBridge.requestSession('SESSION_GET', null);
      void nativeBridge.requestSession('SESSION_GET', null);
    }).not.toThrow();

    const requestIds = posted.map((raw) => JSON.parse(raw).payload.requestId);
    expect(requestIds).toHaveLength(2);
    expect(requestIds[0]).toBeTruthy();
    expect(new Set(requestIds).size).toBe(2);
  });
});
