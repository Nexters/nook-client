import { describe, expect, it } from 'vitest';
import { buildAppSharedLink } from './appLink';

describe('buildAppSharedLink', () => {
  it('prod 웹에서는 본앱 스킴의 공유 딥링크를 만든다', () => {
    expect(buildAppSharedLink('tok-123', 'everynook.co.kr')).toBe(
      'kr.co.everynook.app://shared/tok-123',
    );
  });

  it.each(['app-dev.everynook.co.kr', 'localhost'])('%s 에서는 dev 앱 스킴으로 연다', (host) => {
    expect(buildAppSharedLink('tok-123', host)).toBe('kr.co.everynook.app.dev://shared/tok-123');
  });

  it('알 수 없는 호스트(미리보기 등)는 prod 로 떨어진다', () => {
    expect(buildAppSharedLink('tok-123', 'nook-client-web-abc.vercel.app')).toBe(
      'kr.co.everynook.app://shared/tok-123',
    );
  });
});
