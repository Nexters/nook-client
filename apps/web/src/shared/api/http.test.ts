import { describe, expect, it, vi } from 'vitest';
import { ApiClientError } from './error';
import { ApiClient } from './http';

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

describe('ApiClient', () => {
  it('Base URL이 없어도 생성할 수 있고 요청 시 설정 오류를 반환한다', async () => {
    const fetcher = vi.fn<typeof fetch>();
    const client = new ApiClient({ fetcher });

    await expect(client.request('/resources')).rejects.toMatchObject({
      kind: 'contract',
      message: 'VITE_API_BASE_URL이 설정되지 않았습니다.',
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('Base URL과 인증 토큰을 적용한다', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ ok: true }));
    const client = new ApiClient({
      baseUrl: 'https://api.example.com/api/v1',
      fetcher,
      getAccessToken: () => 'access-token',
    });

    await client.request('/resources', { auth: 'required' });

    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(url).toBe('https://api.example.com/api/v1/resources');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer access-token');
    expect(new Headers(init?.headers).get('Accept')).toBe('application/json');
  });

  it('슬래시로 시작하는 path를 base pathname 뒤에 이어 붙인다', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ ok: true }));
    const client = new ApiClient({
      baseUrl: 'https://api.example.com/api/v1/',
      fetcher,
    });

    await client.request('/groups/42');

    const [url] = fetcher.mock.calls[0] ?? [];
    expect(url).toBe('https://api.example.com/api/v1/groups/42');
  });

  it('필수 인증 요청에 토큰이 없으면 네트워크 요청 전에 실패한다', async () => {
    const fetcher = vi.fn<typeof fetch>();
    const client = new ApiClient({ baseUrl: 'https://api.example.com/api/v1/', fetcher });

    await expect(client.request('/resources', { auth: 'required' })).rejects.toMatchObject({
      kind: 'auth',
      code: 'AUTH_REQUIRED',
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('공통 실패 응답을 ApiClientError로 정규화한다', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse(
        {
          resultType: 'FAIL',
          error: {
            errorCode: 'RESOURCE_DUPLICATED',
            reason: '이미 존재하는 리소스입니다.',
            data: { id: 17 },
          },
        },
        { status: 409 },
      ),
    );
    const client = new ApiClient({ baseUrl: 'https://api.example.com/api/v1/', fetcher });

    await expect(client.request('/resources')).rejects.toMatchObject({
      kind: 'http',
      status: 409,
      code: 'RESOURCE_DUPLICATED',
      message: '이미 존재하는 리소스입니다.',
      data: { id: 17 },
    });
  });

  it('인증 API의 이전 오류 응답도 같은 에러로 정규화한다', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse(
        {
          code: 'INVALID_ACCESS_TOKEN',
          message: '인증 정보가 유효하지 않습니다.',
          fieldErrors: [],
        },
        { status: 401 },
      ),
    );
    const client = new ApiClient({ baseUrl: 'https://api.example.com/api/v1/', fetcher });

    await expect(client.request('/resources')).rejects.toMatchObject({
      kind: 'http',
      status: 401,
      code: 'INVALID_ACCESS_TOKEN',
    });
  });

  it('인증 토큰을 다른 출처로 전달하지 않는다', async () => {
    const client = new ApiClient({
      baseUrl: 'https://api.example.com/api/v1/',
      getAccessToken: () => 'access-token',
    });

    await expect(
      client.request('https://external.example.com/data', { auth: 'required' }),
    ).rejects.toBeInstanceOf(ApiClientError);
    await expect(
      client.request('https://external.example.com/data', { auth: 'required' }),
    ).rejects.toMatchObject({ kind: 'contract' });
  });

  it('fetch 실패를 네트워크 오류로 변환한다', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch'));
    const client = new ApiClient({ baseUrl: 'https://api.example.com/api/v1/', fetcher });

    await expect(client.request('/resources')).rejects.toMatchObject({
      kind: 'network',
      message: '네트워크 연결을 확인해주세요.',
    });
  });
});
