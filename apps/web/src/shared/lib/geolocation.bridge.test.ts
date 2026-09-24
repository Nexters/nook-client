import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// 브리지 지원 여부는 모듈 로드(싱글턴 생성) 시점에 window 에서 읽으므로,
// 전역을 먼저 심고 모듈을 새로 import 해서 검증한다.
beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  Reflect.deleteProperty(window, 'ReactNativeWebView');
  Reflect.deleteProperty(window, '__nookPlatform');
  Reflect.deleteProperty(window, '__nookBridgeFeatures');
  Reflect.deleteProperty(window, '__nookReceive');
  vi.unstubAllGlobals();
});

function stubNavigatorGeolocation() {
  const getCurrentPosition = vi.fn((success: PositionCallback) => {
    success({ coords: { latitude: 35.1, longitude: 129.0 } } as GeolocationPosition);
  });
  vi.stubGlobal('navigator', { ...navigator, geolocation: { getCurrentPosition } });
  return getCurrentPosition;
}

describe('getCurrentPosition', () => {
  it('위치 브리지를 지원하는 셸에서는 navigator.geolocation 대신 셸에 묻는다', async () => {
    const postMessage = vi.fn();
    window.ReactNativeWebView = { postMessage };
    window.__nookPlatform = 'ios';
    window.__nookBridgeFeatures = ['geolocation'];
    const webGeolocation = stubNavigatorGeolocation();

    const { nativeBridge } = await import('@/native-bridge');
    const { getCurrentPosition } = await import('./geolocation');
    nativeBridge.start();
    postMessage.mockClear();

    const pending = getCurrentPosition();
    const request = JSON.parse(postMessage.mock.calls[0]?.[0] as string);
    expect(request.type).toBe('GET_CURRENT_POSITION');
    window.__nookReceive?.(
      JSON.stringify({
        v: 1,
        type: 'CURRENT_POSITION_RESULT',
        payload: { requestId: request.payload.requestId, coords: { lat: 37.5, lng: 127 } },
      }),
    );

    await expect(pending).resolves.toEqual({ lat: 37.5, lng: 127 });
    expect(webGeolocation).not.toHaveBeenCalled();
  });

  it('브리지를 모르는 구버전 셸에서는 navigator.geolocation 으로 떨어진다', async () => {
    const postMessage = vi.fn();
    window.ReactNativeWebView = { postMessage };
    window.__nookPlatform = 'ios';
    const webGeolocation = stubNavigatorGeolocation();

    const { getCurrentPosition } = await import('./geolocation');

    await expect(getCurrentPosition()).resolves.toEqual({ lat: 35.1, lng: 129 });
    expect(webGeolocation).toHaveBeenCalledOnce();
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('브라우저에서는 navigator.geolocation 을 쓴다', async () => {
    const webGeolocation = stubNavigatorGeolocation();

    const { getCurrentPosition } = await import('./geolocation');

    await expect(getCurrentPosition()).resolves.toEqual({ lat: 35.1, lng: 129 });
    expect(webGeolocation).toHaveBeenCalledOnce();
  });
});
