import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/config/env', () => ({
  env: { webOrigin: 'https://www.everynook.co.kr' },
}));

import { buildShareUrl } from './shareUrl';

describe('buildShareUrl', () => {
  it('웹 오리진 + /shared/{token} 으로 조립한다', () => {
    expect(buildShareUrl('tok-123')).toBe('https://www.everynook.co.kr/shared/tok-123');
  });
});
