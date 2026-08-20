import NookSession, { type StoredSession } from '../../modules/session/src';

interface ApiEnvelope<T> {
  resultType: string;
  success?: T;
}

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

let generation = 0;
let refreshPromise: Promise<StoredSession | null> | null = null;

/**
 * webApiBaseUrl 은 웹이 지금 쓰는 API 오리진. 발급처 기록이 없거나 달라진 저장 세션은
 * 이 값으로 다시 찍는다 — 이 필드가 없던 시절에 저장된 세션을 재로그인 없이 이관하기 위한 것.
 */
export async function restoreSession(webApiBaseUrl?: string | null): Promise<StoredSession | null> {
  const session = await NookSession.getSession();
  if (!session || !webApiBaseUrl || session.apiBaseUrl === webApiBaseUrl) return session;
  return establishSession(session.accessToken, session.refreshToken, webApiBaseUrl);
}

export async function establishSession(
  accessToken: string,
  refreshToken: string | null,
  apiBaseUrl: string | null,
): Promise<StoredSession> {
  generation += 1;
  return NookSession.setSession(accessToken, refreshToken, apiBaseUrl);
}

export async function clearSession(): Promise<void> {
  generation += 1;
  await NookSession.clearSession();
}

export function refreshSession(failedRevision: number): Promise<StoredSession | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = performRefresh(failedRevision).finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

async function performRefresh(failedRevision: number): Promise<StoredSession | null> {
  const before = await NookSession.getSession();
  if (!before) return null;
  if (before.revision > failedRevision) return before;
  if (!before.refreshToken) {
    await clearSession();
    return null;
  }
  // 발급처를 모르면 갱신을 보낼 곳이 없다. 세션은 지우지 않는다 — 앱을 열면 SESSION_GET 이
  // 발급처를 채워 재로그인 없이 되살아난다.
  if (!before.apiBaseUrl) return null;
  const refreshGeneration = generation;
  const response = await fetch(
    `${before.apiBaseUrl.replace(/\/$/, '')}/api/v1/auth/token/refresh`,
    {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: before.refreshToken }),
    },
  );
  if (response.status >= 400 && response.status < 500) {
    if (refreshGeneration === generation) await clearSession();
    return null;
  }
  if (!response.ok) throw new Error(`세션 갱신 실패 (${response.status})`);
  const envelope = (await response.json()) as ApiEnvelope<TokenResponse>;
  const tokens = envelope.success;
  if (!tokens?.accessToken || !tokens.refreshToken) throw new Error('잘못된 세션 갱신 응답');
  if (refreshGeneration !== generation) return NookSession.getSession();
  return establishSession(tokens.accessToken, tokens.refreshToken, before.apiBaseUrl);
}
