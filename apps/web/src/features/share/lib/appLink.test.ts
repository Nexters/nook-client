import { describe, expect, it } from 'vitest';
import { buildAppSharedLink } from './appLink';

describe('buildAppSharedLink', () => {
  it('본앱 스킴의 공유 딥링크를 만든다', () => {
    expect(buildAppSharedLink('tok-123')).toBe('kr.co.everynook.app://shared/tok-123');
  });
});
