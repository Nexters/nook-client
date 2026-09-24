import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/config/env', () => ({
  env: { webOrigin: 'https://www.everynook.co.kr' },
}));

const requestShare = vi.hoisted(() => vi.fn(() => Promise.resolve(true)));

vi.mock('@/native-bridge', () => ({ nativeBridge: { requestShare } }));

import { buildShareUrl, shareViaSystem } from './shareUrl';

const TARGET = { title: 'nook', url: 'https://www.everynook.co.kr' };

function setWebShare(share: ((data: unknown) => Promise<void>) | undefined) {
  Object.defineProperty(navigator, 'share', { configurable: true, value: share });
}

function abortError() {
  const error = new Error('cancelled');
  error.name = 'AbortError';
  return error;
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'share');
  requestShare.mockClear();
});

describe('buildShareUrl', () => {
  it('웹 오리진 + /shared/{token} 으로 조립한다', () => {
    expect(buildShareUrl('tok-123')).toBe('https://www.everynook.co.kr/shared/tok-123');
  });
});

describe('shareViaSystem', () => {
  it('navigator.share 가 되면 그걸로 끝낸다 — 셸에 넘기지 않는다', async () => {
    setWebShare(vi.fn(() => Promise.resolve()));

    await expect(shareViaSystem(TARGET)).resolves.toBe(true);
    expect(requestShare).not.toHaveBeenCalled();
  });

  it('사용자가 시트를 닫은 것(AbortError)은 취소다 — 셸로 다시 열지 않는다', async () => {
    setWebShare(vi.fn(() => Promise.reject(abortError())));

    await expect(shareViaSystem(TARGET)).resolves.toBe(false);
    expect(requestShare).not.toHaveBeenCalled();
  });

  it('navigator.share 가 없으면 셸에 넘긴다 (Android WebView)', async () => {
    setWebShare(undefined);

    await expect(shareViaSystem(TARGET)).resolves.toBe(true);
    expect(requestShare).toHaveBeenCalledWith(TARGET);
  });

  it('navigator.share 가 있어도 거절되면 셸에 넘긴다 (NotAllowedError)', async () => {
    setWebShare(vi.fn(() => Promise.reject(new Error('NotAllowedError'))));

    await expect(shareViaSystem(TARGET)).resolves.toBe(true);
    expect(requestShare).toHaveBeenCalledWith(TARGET);
  });
});
