export interface ApiErrorDto {
  errorCode: string;
  reason: string;
  data?: unknown;
}

export type ApiResponse<T> =
  | {
      resultType: 'SUCCESS';
      success: T;
      error?: null;
    }
  | {
      resultType: 'FAIL';
      success?: null;
      error: ApiErrorDto;
    };

/** 인증 계열 API와 Spring Security가 아직 사용하는 이전 오류 응답 형식. */
export interface LegacyApiErrorDto {
  code: string;
  message: string;
  fieldErrors?: ReadonlyArray<{
    field: string;
    reason: string;
  }>;
}
