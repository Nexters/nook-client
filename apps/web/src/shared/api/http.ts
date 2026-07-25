import { env } from '@/shared/config/env';

/**
 * 얇은 fetch 래퍼. 기능 모듈의 api.ts 들이 이걸 통해 BE 를 호출한다.
 *
 * NOTE: 네이티브에서 CORS 우회가 필요한 호출(예: 온디바이스 인스타 fetch)은
 * 후속 계획에서 셸 브리지를 통해 네이티브가 대신 요청하도록 교체한다. 그 교체
 * 지점을 여기(요청 실행부) 한 곳으로 모아두어 features 코드는 바뀌지 않게 한다.
 */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly url: string,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = path.startsWith('http') ? path : `${env.apiBaseUrl}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!res.ok) {
    throw new HttpError(res.status, url, `요청 실패: ${res.status} ${res.statusText}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}
