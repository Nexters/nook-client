import { env } from '@/shared/config/env';

/**
 * 얇은 fetch 래퍼. 기능 모듈의 api.ts 들이 이걸 통해 BE 를 호출한다.
 *
 * 원격 웹(app.nook.com)이 같은/다른 origin 의 BE 를 호출한다. 인증 헤더 주입 등
 * 공통 처리는 이 요청 실행부 한 곳에 모아 features 코드는 바뀌지 않게 한다.
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
