import { env } from '@/shared/config/env';
import { ApiClientError, createHttpError } from './error';

const DEFAULT_TIMEOUT_MS = 15_000;

export type ApiAuthMode = 'none' | 'optional' | 'required';
export type AccessTokenProvider = () => Promise<string | null> | string | null;
export type SessionRefresher = () => Promise<string | null>;

export interface ApiRequestInit extends RequestInit {
  /** 외부 URL에 토큰이 실수로 전달되지 않도록 기본값은 none이다. */
  auth?: ApiAuthMode;
  timeoutMs?: number;
}

export interface ApiRequester {
  request<T>(path: string, init?: ApiRequestInit): Promise<T>;
}

interface ApiClientOptions {
  baseUrl?: string;
  fetcher?: typeof fetch;
  getAccessToken?: AccessTokenProvider;
  defaultTimeoutMs?: number;
}

function parseBaseUrl(value: string): URL {
  try {
    // dev 프록시를 쓸 때의 상대 경로(`/api/v1`)도 허용한다 — 현재 출처 기준으로 해석한다.
    return new URL(value, globalThis.location?.origin);
  } catch (cause) {
    throw new ApiClientError(`올바르지 않은 API Base URL입니다: ${value}`, {
      kind: 'contract',
      cause,
    });
  }
}

/** API path는 `/groups`처럼 슬래시로 시작한다. base pathname 뒤에 이어 붙인다. */
function resolveRequestUrl(baseUrl: URL, path: string): URL {
  if (/^https?:\/\//i.test(path)) {
    return new URL(path);
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const basePath = baseUrl.pathname.replace(/\/$/, '');
  return new URL(`${basePath}${normalizedPath}`, baseUrl.origin);
}

async function parseResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;

  const text = await response.text();
  if (!text) return undefined;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export class ApiClient implements ApiRequester {
  private readonly baseUrl?: URL;
  private readonly fetcher: typeof fetch;
  private readonly defaultTimeoutMs: number;
  private getAccessToken?: AccessTokenProvider;
  private refreshSession?: SessionRefresher;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl ? parseBaseUrl(options.baseUrl) : undefined;
    // 전역 fetch 는 반드시 globalThis 에 바인딩해서 보관한다. 언바인딩된 참조를 인스턴스
    // 프로퍼티로 호출하면 브라우저가 `TypeError: Illegal invocation` 을 던져, 요청이 나가지도
    // 않은 채 아래 catch 의 네트워크 오류로 둔갑한다. (Node/undici 는 허용해서 테스트에선 안 보임)
    this.fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis);
    this.getAccessToken = options.getAccessToken;
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  setAccessTokenProvider(provider?: AccessTokenProvider): void {
    this.getAccessToken = provider;
  }

  setSessionRefresher(refresher?: SessionRefresher): void {
    this.refreshSession = refresher;
  }

  async request<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
    return this.requestOnce<T>(path, init, false);
  }

  private async requestOnce<T>(path: string, init: ApiRequestInit, retried: boolean): Promise<T> {
    if (!this.baseUrl) {
      throw new ApiClientError('VITE_API_BASE_URL이 설정되지 않았습니다.', {
        kind: 'contract',
      });
    }

    const { auth = 'none', timeoutMs = this.defaultTimeoutMs, signal, ...requestInit } = init;
    const url = resolveRequestUrl(this.baseUrl, path);

    if (auth !== 'none' && url.origin !== this.baseUrl.origin) {
      throw new ApiClientError('외부 출처 요청에는 인증 토큰을 전달할 수 없습니다.', {
        kind: 'contract',
        url: url.toString(),
      });
    }

    const headers = new Headers(requestInit.headers);
    if (!headers.has('Accept')) headers.set('Accept', 'application/json');
    if (requestInit.body !== undefined && !headers.has('Content-Type')) {
      const isFormData = typeof FormData !== 'undefined' && requestInit.body instanceof FormData;
      if (!isFormData) headers.set('Content-Type', 'application/json');
    }

    if (auth !== 'none' && !headers.has('Authorization')) {
      const accessToken = await this.getAccessToken?.();
      if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`);
      } else if (auth === 'required') {
        throw new ApiClientError('로그인이 필요한 요청입니다.', {
          kind: 'auth',
          code: 'AUTH_REQUIRED',
          url: url.toString(),
        });
      }
    }

    const controller = new AbortController();
    let timedOut = false;
    const abortFromCaller = () => controller.abort(signal?.reason);
    if (signal?.aborted) abortFromCaller();
    else signal?.addEventListener('abort', abortFromCaller, { once: true });

    const timeoutId =
      timeoutMs > 0
        ? setTimeout(() => {
            timedOut = true;
            controller.abort();
          }, timeoutMs)
        : undefined;

    try {
      const response = await this.fetcher(url.toString(), {
        ...requestInit,
        headers,
        signal: controller.signal,
      });
      const payload = await parseResponseBody(response);

      if (
        response.status === 401 &&
        auth !== 'none' &&
        !retried &&
        !url.pathname.endsWith('/auth/token/refresh') &&
        this.refreshSession
      ) {
        const token = await this.refreshSession();
        if (token) {
          const retryHeaders = new Headers(init.headers);
          retryHeaders.delete('Authorization');
          return this.requestOnce<T>(path, { ...init, headers: retryHeaders }, true);
        }
      }
      if (!response.ok) throw createHttpError(response, payload);
      return payload as T;
    } catch (cause) {
      if (cause instanceof ApiClientError) throw cause;
      if (timedOut) {
        throw new ApiClientError('요청 시간이 초과되었습니다.', {
          kind: 'timeout',
          url: url.toString(),
          cause,
        });
      }
      if (controller.signal.aborted) {
        throw new ApiClientError('요청이 취소되었습니다.', {
          kind: 'aborted',
          url: url.toString(),
          cause,
        });
      }
      throw new ApiClientError('네트워크 연결을 확인해주세요.', {
        kind: 'network',
        url: url.toString(),
        cause,
      });
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      signal?.removeEventListener('abort', abortFromCaller);
    }
  }
}

export const apiClient = new ApiClient({ baseUrl: env.apiBaseUrl });

/** 생성 클라이언트의 custom fetch/mutator가 사용할 기본 진입점. */
export function apiFetch<T>(path: string, init?: ApiRequestInit): Promise<T> {
  return apiClient.request<T>(path, init);
}
