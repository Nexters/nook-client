import type { ApiResponse } from './contracts';
import { ApiClientError } from './error';

export function unwrapApiResponse<T>(response: ApiResponse<T>): T {
  if (response.resultType === 'SUCCESS') {
    if (!('success' in response) || response.success === undefined) {
      throw new ApiClientError('성공 응답에 success 필드가 없습니다.', {
        kind: 'contract',
      });
    }
    return response.success;
  }

  if (!response.error) {
    throw new ApiClientError('실패 응답에 error 필드가 없습니다.', {
      kind: 'contract',
    });
  }

  throw new ApiClientError(response.error.reason ?? 'API 요청에 실패했습니다.', {
    kind: 'api',
    code: response.error.errorCode,
    data: response.error.data,
  });
}
