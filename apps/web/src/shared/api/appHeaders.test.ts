import { describe, expect, it } from 'vitest';
import { buildAppHeaders } from './appHeaders';

describe('buildAppHeaders', () => {
  it('iOS 셸에서는 플랫폼·버전·빌드 번호를 서버 표기로 담는다', () => {
    expect(
      buildAppHeaders({
        isNative: true,
        platform: 'ios',
        appVersion: '1.1.1',
        appBuildNumber: '42',
      }),
    ).toEqual({
      'X-App-Platform': 'IOS',
      'X-App-Version': '1.1.1',
      'X-App-Build-Number': '42',
    });
  });

  it('Android 셸에서는 플랫폼을 ANDROID 로 담는다', () => {
    expect(
      buildAppHeaders({
        isNative: true,
        platform: 'android',
        appVersion: '1.1.1',
        appBuildNumber: '7',
      }),
    ).toEqual({
      'X-App-Platform': 'ANDROID',
      'X-App-Version': '1.1.1',
      'X-App-Build-Number': '7',
    });
  });

  it('브라우저에서는 앱 헤더를 만들지 않는다', () => {
    expect(
      buildAppHeaders({
        isNative: false,
        platform: 'web',
        appVersion: null,
        appBuildNumber: null,
      }),
    ).toBeNull();
  });

  it('구버전 셸이라 모르는 값은 해당 헤더만 뺀다', () => {
    expect(
      buildAppHeaders({
        isNative: true,
        platform: 'ios',
        appVersion: '1.0.2',
        appBuildNumber: null,
      }),
    ).toEqual({
      'X-App-Platform': 'IOS',
      'X-App-Version': '1.0.2',
    });
  });
});
