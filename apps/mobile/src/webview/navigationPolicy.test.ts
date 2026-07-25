import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  NativeModules: {},
  Platform: { OS: 'android', Version: 0 },
}));

import {
  decideNavigation,
  isOpenableExternalUrl,
  isTrustedUrl,
  resolveHttpOrigin,
} from './navigationPolicy';

const TRUSTED_ORIGIN = 'https://app.nook.com';

describe('resolveHttpOrigin', () => {
  it('URL 을 정규화한 origin 을 반환한다', () => {
    expect(resolveHttpOrigin('HTTPS://APP.NOOK.COM:443/place/1')).toBe(TRUSTED_ORIGIN);
  });

  it('기본 포트를 제거한다', () => {
    expect(resolveHttpOrigin('https://app.nook.com:443')).toBe(TRUSTED_ORIGIN);
  });

  it.each(['not-a-url', 'https://', 'file:///tmp/nook', 'javascript:alert(1)'])(
    'http(s)가 아닌 값은 거부한다: %s',
    (value) => {
      expect(() => resolveHttpOrigin(value)).toThrow();
    },
  );
});

describe('isTrustedUrl', () => {
  it('같은 origin 의 경로만 신뢰한다', () => {
    expect(isTrustedUrl('https://app.nook.com/place/1?tab=map', TRUSTED_ORIGIN)).toBe(true);
    expect(isTrustedUrl('https://app.nook.com.evil.com', TRUSTED_ORIGIN)).toBe(false);
    expect(isTrustedUrl('http://app.nook.com', TRUSTED_ORIGIN)).toBe(false);
  });

  it('origin 이 없는 URL 은 빈 trusted origin 으로도 신뢰하지 않는다', () => {
    expect(isTrustedUrl('javascript:alert(1)', '')).toBe(false);
  });
});

describe('decideNavigation', () => {
  it.each(['https://example.com', 'mailto:hello@nook.com', 'tel:01012345678'])(
    '허용한 외부 프로토콜은 외부 앱으로 보낸다: %s',
    (value) => {
      expect(decideNavigation(value, TRUSTED_ORIGIN)).toBe('open-external');
    },
  );

  it.each(['javascript:alert(1)', 'file:///tmp/nook', 'data:text/html,test', 'nook://open'])(
    '위험하거나 알 수 없는 프로토콜은 차단한다: %s',
    (value) => {
      expect(decideNavigation(value, TRUSTED_ORIGIN)).toBe('block');
    },
  );

  it('서브프레임 탐색은 허용한다', () => {
    expect(decideNavigation('https://maps.example.com/embed', TRUSTED_ORIGIN, false)).toBe('allow');
  });
});

describe('isOpenableExternalUrl', () => {
  it('같은 origin 이어도 외부 열기 명령에는 https URL 을 허용한다', () => {
    expect(isOpenableExternalUrl('https://app.nook.com/privacy')).toBe(true);
  });

  it('커스텀 스킴은 허용하지 않는다', () => {
    expect(isOpenableExternalUrl('nook://open')).toBe(false);
  });
});
