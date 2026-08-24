import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// 앱 정보 필드는 모듈 로드(싱글턴 생성) 시점에 window 에서 읽으므로,
// 전역을 먼저 심고 모듈을 새로 import 해서 검증한다.
beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  Reflect.deleteProperty(window, 'ReactNativeWebView');
  Reflect.deleteProperty(window, '__nookPlatform');
  Reflect.deleteProperty(window, '__nookAppVersion');
  Reflect.deleteProperty(window, '__nookBuildNumber');
});

describe('셸이 주입한 앱 정보', () => {
  it('플랫폼·버전·빌드 번호를 읽는다', async () => {
    window.ReactNativeWebView = { postMessage: () => undefined };
    window.__nookPlatform = 'ios';
    window.__nookAppVersion = '1.1.1';
    window.__nookBuildNumber = '42';

    const { nativeBridge } = await import('./nativeBridge');

    expect(nativeBridge.isNative).toBe(true);
    expect(nativeBridge.platform).toBe('ios');
    expect(nativeBridge.appVersion).toBe('1.1.1');
    expect(nativeBridge.appBuildNumber).toBe('42');
  });

  it('빌드 번호를 주입하지 않는 구버전 셸에서는 null 이다', async () => {
    window.ReactNativeWebView = { postMessage: () => undefined };
    window.__nookPlatform = 'ios';
    window.__nookAppVersion = '1.0.2';

    const { nativeBridge } = await import('./nativeBridge');

    expect(nativeBridge.appBuildNumber).toBeNull();
  });

  it('브라우저에서는 버전과 빌드 번호 모두 null 이다', async () => {
    const { nativeBridge } = await import('./nativeBridge');

    expect(nativeBridge.appVersion).toBeNull();
    expect(nativeBridge.appBuildNumber).toBeNull();
  });
});
