import type { ApiError } from './generated/models';

export type ApiErrorDto = ApiError;

/** Swagger의 공통 응답 래퍼를 기능 코드에서 동일하게 해석하기 위한 구조 타입. */
export interface ApiResponse<T> {
  resultType: 'SUCCESS' | 'FAIL';
  success?: T;
  error?: ApiErrorDto | null;
}

/** 인증 계열 API와 Spring Security가 아직 사용하는 이전 오류 응답 형식. */
export interface LegacyApiErrorDto {
  code: string;
  message: string;
  fieldErrors?: ReadonlyArray<{
    field: string;
    reason: string;
  }>;
}
