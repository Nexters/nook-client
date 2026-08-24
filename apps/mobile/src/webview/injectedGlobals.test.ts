import { describe, expect, it } from 'vitest';
import { buildInjectedGlobalsScript } from './injectedGlobals';

/** 셸이 WebView 에 주입하는 스크립트를 실제로 실행해 window 에 남는 값을 검증한다. */
function runScript(script: string): Record<string, unknown> {
  const fakeWindow: Record<string, unknown> = {};
  new Function('window', script)(fakeWindow);
  return fakeWindow;
}

describe('buildInjectedGlobalsScript', () => {
  it('플랫폼·앱 버전·빌드 번호를 window 전역으로 심는다', () => {
    const script = buildInjectedGlobalsScript({
      platform: 'ios',
      appVersion: '1.1.1',
      buildNumber: '42',
    });

    expect(runScript(script)).toEqual({
      __nookPlatform: 'ios',
      __nookAppVersion: '1.1.1',
      __nookBuildNumber: '42',
    });
  });

  it('모르는 값은 빈 문자열로 심는다 — 웹이 null 로 정규화한다', () => {
    const script = buildInjectedGlobalsScript({
      platform: 'android',
      appVersion: '',
      buildNumber: '',
    });

    expect(runScript(script)).toEqual({
      __nookPlatform: 'android',
      __nookAppVersion: '',
      __nookBuildNumber: '',
    });
  });

  it('injectedJavaScriptBeforeContentLoaded 규약대로 true 로 끝난다', () => {
    const script = buildInjectedGlobalsScript({
      platform: 'ios',
      appVersion: '1.1.1',
      buildNumber: '42',
    });

    expect(script.trim().endsWith('true;')).toBe(true);
  });
});
