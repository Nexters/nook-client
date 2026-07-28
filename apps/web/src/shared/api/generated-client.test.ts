import { beforeEach, describe, expect, it, vi } from 'vitest';
import { list } from './generated/endpoints.generated';
import { unwrapApiResponse } from './response';

const mocks = vi.hoisted(() => ({
  orvalMutator: vi.fn(),
}));

vi.mock('./orval-mutator', () => ({
  orvalMutator: mocks.orvalMutator,
}));

describe('Orval generated client', () => {
  beforeEach(() => {
    mocks.orvalMutator.mockReset();
    mocks.orvalMutator.mockResolvedValue({ resultType: 'SUCCESS', success: [] });
  });

  it('생성 함수에서 인증 옵션과 HTTP 메서드를 mutator로 전달한다', async () => {
    const response = await list({ auth: 'required' });

    expect(mocks.orvalMutator).toHaveBeenCalledWith('/api/v1/groups', {
      auth: 'required',
      method: 'GET',
    });
    expect(unwrapApiResponse(response)).toEqual([]);
  });
});
