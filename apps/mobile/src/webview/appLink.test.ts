import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  NativeModules: {},
  Platform: { OS: 'android', Version: 0 },
}));

import { resolveAppLinkWebUrl } from './appLink';

const WEB_URL = 'https://www.everynook.co.kr';

describe('resolveAppLinkWebUrl', () => {
  it.each(['com.nook.app.dev://login', 'com.nook.app:///login', 'kr.com.nook.app.dev://login'])(
    '로그인 딥링크를 웹 로그인 화면으로 변환한다: %s',
    (value) => {
      expect(resolveAppLinkWebUrl(value, WEB_URL)).toBe(`${WEB_URL}/login`);
    },
  );

  it.each([
    'com.nook.app.dev://post/42',
    'com.nook.app://post/42',
    'kr.com.nook.app.dev://post/42',
  ])('게시글 딥링크를 웹 상세 화면으로 변환한다: %s', (value) => {
    expect(resolveAppLinkWebUrl(value, WEB_URL)).toBe(`${WEB_URL}/post/42?entry=share`);
  });

  it.each([
    'com.nook.app.dev://post/not-a-number',
    'com.nook.app.dev://group/1',
    'com.nook.app.dev://post/1?next=https://evil.example',
    'https://www.everynook.co.kr/post/1',
  ])('허용하지 않은 딥링크를 거부한다: %s', (value) => {
    expect(resolveAppLinkWebUrl(value, WEB_URL)).toBeNull();
  });
});
