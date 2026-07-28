import type { LegacyApiErrorDto } from './contracts';

export type ApiClientErrorKind =
  | 'api'
  | 'auth'
  | 'http'
  | 'network'
  | 'timeout'
  | 'aborted'
  | 'contract';

interface ApiClientErrorOptions {
  kind: ApiClientErrorKind;
  status?: number;
  url?: string;
  code?: string;
  data?: unknown;
  fieldErrors?: LegacyApiErrorDto['fieldErrors'];
  cause?: unknown;
}

export class ApiClientError extends Error {
  readonly kind: ApiClientErrorKind;
  readonly status?: number;
  readonly url?: string;
  readonly code?: string;
  readonly data?: unknown;
  readonly fieldErrors: LegacyApiErrorDto['fieldErrors'];

  constructor(message: string, options: ApiClientErrorOptions) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'ApiClientError';
    this.kind = options.kind;
    this.status = options.status;
    this.url = options.url;
    this.code = options.code;
    this.data = options.data;
    this.fieldErrors = options.fieldErrors ?? [];
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function readFieldErrors(value: unknown): LegacyApiErrorDto['fieldErrors'] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const field = readString(item.field);
    const reason = readString(item.reason);
    return field && reason ? [{ field, reason }] : [];
  });
}

export function createHttpError(response: Response, payload: unknown): ApiClientError {
  const fallbackMessage = `요청에 실패했습니다. (${response.status})`;

  if (isRecord(payload) && payload.resultType === 'FAIL' && isRecord(payload.error)) {
    return new ApiClientError(readString(payload.error.reason) ?? fallbackMessage, {
      kind: 'http',
      status: response.status,
      url: response.url,
      code: readString(payload.error.errorCode),
      data: payload.error.data,
    });
  }

  if (isRecord(payload)) {
    return new ApiClientError(readString(payload.message) ?? fallbackMessage, {
      kind: 'http',
      status: response.status,
      url: response.url,
      code: readString(payload.code),
      fieldErrors: readFieldErrors(payload.fieldErrors),
    });
  }

  return new ApiClientError(fallbackMessage, {
    kind: 'http',
    status: response.status,
    url: response.url,
  });
}
