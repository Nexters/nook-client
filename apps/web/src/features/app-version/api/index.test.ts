import { beforeEach, describe, expect, it, vi } from 'vitest';

const endpoints = vi.hoisted(() => ({ getPolicy: vi.fn() }));

vi.mock('@/shared/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api')>()),
  ...endpoints,
}));

import { fetchAppVersionPolicy } from '.';

beforeEach(() => {
  endpoints.getPolicy.mockReset();
});

describe('fetchAppVersionPolicy', () => {
  it('공통 응답을 벗겨 정책 모델로 만든다', async () => {
    endpoints.getPolicy.mockResolvedValue({
      resultType: 'SUCCESS',
      success: {
        updateType: 'FORCE',
        latestBuildNumber: 57,
        latestVersion: '1.2.0',
        storeUrl: 'https://apps.apple.com/app/id123',
      },
    });

    await expect(fetchAppVersionPolicy()).resolves.toEqual({
      updateType: 'FORCE',
      latestBuildNumber: 57,
      latestVersion: '1.2.0',
      storeUrl: 'https://apps.apple.com/app/id123',
    });
  });

  it('서버가 비워 보낸 값은 null 로 정규화한다', async () => {
    endpoints.getPolicy.mockResolvedValue({
      resultType: 'SUCCESS',
      success: { updateType: 'NONE' },
    });

    await expect(fetchAppVersionPolicy()).resolves.toEqual({
      updateType: 'NONE',
      latestBuildNumber: null,
      latestVersion: null,
      storeUrl: null,
    });
  });

  it('식별 헤더는 ApiClient 가 자동으로 붙이므로 호출부는 헤더를 넘기지 않는다', async () => {
    endpoints.getPolicy.mockResolvedValue({
      resultType: 'SUCCESS',
      success: { updateType: 'NONE' },
    });

    await fetchAppVersionPolicy();

    expect(endpoints.getPolicy).toHaveBeenCalledOnce();
    expect(endpoints.getPolicy.mock.calls[0]).toHaveLength(0);
  });
});
