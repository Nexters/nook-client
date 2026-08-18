import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  NativeModules: {},
  Platform: { OS: 'android', Version: 0 },
}));

import { resolveAppLinkWebUrl } from './appLink';

const WEB_URL = 'https://www.everynook.co.kr';

describe('resolveAppLinkWebUrl', () => {
  it.each(['kr.co.everynook.app://login', 'kr.co.everynook.app:///login'])(
    '로그인 딥링크를 웹 로그인 화면으로 변환한다: %s',
    (value) => {
      expect(resolveAppLinkWebUrl(value, WEB_URL)).toBe(`${WEB_URL}/login`);
    },
  );

  it('게시글 딥링크를 웹 상세 화면으로 변환한다', () => {
    expect(resolveAppLinkWebUrl('kr.co.everynook.app://post/42', WEB_URL)).toBe(
      `${WEB_URL}/post/42?entry=share`,
    );
  });

  it('공유 아카이브 딥링크를 웹 공유 화면으로 변환한다', () => {
    expect(resolveAppLinkWebUrl('kr.co.everynook.app://shared/tok_A1-b2', WEB_URL)).toBe(
      `${WEB_URL}/shared/tok_A1-b2`,
    );
  });

  it.each([
    'kr.co.everynook.app://shared/tok/extra',
    'kr.co.everynook.app://shared/한글토큰',
    'kr.co.everynook.app://shared/tok?x=1',
  ])('형식이 다른 공유 딥링크는 거부한다: %s', (value) => {
    expect(resolveAppLinkWebUrl(value, WEB_URL)).toBeNull();
  });

  it.each([
    'kr.co.everynook.app://post/not-a-number',
    'kr.co.everynook.app://archive/1',
    'kr.co.everynook.app://post/1?next=https://evil.example',
    // 등록되지 않은 스킴(옛 식별자 포함)은 허용하지 않는다
    'com.nook.app://post/1',
    'https://www.everynook.co.kr/post/1',
  ])('허용하지 않은 딥링크를 거부한다: %s', (value) => {
    expect(resolveAppLinkWebUrl(value, WEB_URL)).toBeNull();
  });
});
