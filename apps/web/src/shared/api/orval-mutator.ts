import { env } from '@/shared/config/env';
import { type ApiRequestInit, apiFetch } from './http';

const ORVAL_URL_ORIGIN = 'https://orval.local';

function getApiClientPath(value: string): string {
  const requestUrl = new URL(value, ORVAL_URL_ORIGIN);
  // base URL 은 절대 주소일 수도, dev 프록시용 상대 경로(`/api/v1`)일 수도 있다.
  const configuredBasePath = new URL(env.apiBaseUrl, ORVAL_URL_ORIGIN).pathname.replace(/\/$/, '');
  const requestPath = requestUrl.pathname;

  if (
    configuredBasePath &&
    configuredBasePath !== '/' &&
    (requestPath === configuredBasePath || requestPath.startsWith(`${configuredBasePath}/`))
  ) {
    const relativePath = requestPath.slice(configuredBasePath.length) || '/';
    return `${relativePath}${requestUrl.search}`;
  }

  return `${requestPath}${requestUrl.search}`;
}

export function orvalMutator<T>(url: string, options: ApiRequestInit): Promise<T> {
  return apiFetch<T>(getApiClientPath(url), options);
}
