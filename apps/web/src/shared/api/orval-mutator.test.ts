import { beforeEach, describe, expect, it, vi } from 'vitest';
import { orvalMutator } from './orval-mutator';

const mocks = vi.hoisted(() => ({
  apiFetch: vi.fn(),
}));

vi.mock('@/shared/config/env', () => ({
  env: {
    apiBaseUrl: 'https://api-dev.everynook.co.kr/api/v1',
  },
}));

vi.mock('./http', () => ({
  apiFetch: mocks.apiFetch,
}));

describe('orvalMutator', () => {
  beforeEach(() => {
    mocks.apiFetch.mockReset();
    mocks.apiFetch.mockResolvedValue({ resultType: 'SUCCESS' });
  });

  it('환경변수의 base path를 제거하고 ApiClient 옵션을 그대로 전달한다', async () => {
    const options = {
      auth: 'required' as const,
      method: 'GET',
    };

    await orvalMutator('/api/v1/groups?page=1', options);

    expect(mocks.apiFetch).toHaveBeenCalledWith('/groups?page=1', options);
  });
});
