import { describe, expect, it } from 'vitest';
import type { ApiResponse } from './contracts';
import { unwrapApiResponse } from './response';

describe('unwrapApiResponse', () => {
  it('성공 응답의 본문을 반환한다', () => {
    const response: ApiResponse<{ id: number }> = {
      resultType: 'SUCCESS',
      success: { id: 17 },
    };

    expect(unwrapApiResponse(response)).toEqual({ id: 17 });
  });

  it('HTTP 200으로 전달된 실패 응답도 에러로 변환한다', () => {
    const response: ApiResponse<never> = {
      resultType: 'FAIL',
      error: {
        errorCode: 'INVALID_REQUEST',
        reason: '요청 값이 올바르지 않습니다.',
      },
    };

    expect(() => unwrapApiResponse(response)).toThrow('요청 값이 올바르지 않습니다.');
    try {
      unwrapApiResponse(response);
    } catch (error) {
      expect(error).toMatchObject({ kind: 'api', code: 'INVALID_REQUEST' });
    }
  });
});
