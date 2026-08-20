import { beforeEach, describe, expect, it, vi } from 'vitest';

const nookSession = vi.hoisted(() => ({
  getSession: vi.fn(),
  setSession: vi.fn(),
  clearSession: vi.fn(),
}));

vi.mock('../../modules/session/src', () => ({ default: nookSession }));

import { refreshSession } from './sessionCoordinator';

const storedSession = {
  schemaVersion: 1 as const,
  accessToken: 'access',
  refreshToken: 'refresh',
  apiBaseUrl: 'https://api.everynook.co.kr/',
  revision: 1,
};

function tokenResponse() {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      resultType: 'SUCCESS',
      success: { accessToken: 'next-access', refreshToken: 'next-refresh' },
    }),
  };
}

describe('세션 갱신', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nookSession.setSession.mockImplementation(async () => storedSession);
  });

  it('기록된 발급처에 버전 경로를 붙여 갱신을 요청한다', async () => {
    // 웹이 기록하는 값에는 /api/v1 이 없다. 붙이는 건 이쪽 몫이고, 안 붙이면 404 가 난다.
    nookSession.getSession.mockResolvedValue(storedSession);
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => tokenResponse());
    vi.stubGlobal('fetch', fetchMock);

    await refreshSession(1);

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.everynook.co.kr/api/v1/auth/token/refresh',
    );
    expect(nookSession.setSession).toHaveBeenCalledWith(
      'next-access',
      'next-refresh',
      storedSession.apiBaseUrl,
    );
  });

  it('발급처 기록이 없으면 요청하지 않고 세션도 지우지 않는다', async () => {
    // 이 필드가 생기기 전에 저장된 세션. 지워버리면 앱을 열어도 재로그인해야 한다.
    nookSession.getSession.mockResolvedValue({ ...storedSession, apiBaseUrl: null });
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => tokenResponse());
    vi.stubGlobal('fetch', fetchMock);

    await expect(refreshSession(1)).resolves.toBeNull();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(nookSession.clearSession).not.toHaveBeenCalled();
  });
});
