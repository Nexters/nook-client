import NookSession, { type StoredSession } from '../../modules/session/src';
import { API_BASE_URL } from '../config/appConfig';

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
  const refreshGeneration = generation;
  // 발급처가 기록돼 있으면 그리로 보낸다. 빌드 variant 의 API 와 웹이 실제 쓰는 API 가
  // 어긋나 있어도 토큰은 발급처에서만 유효하다.
  const baseUrl = before.apiBaseUrl ?? API_BASE_URL;
  // base URL 은 웹과 같이 /api/v1 까지 포함한다. 절대 경로로 넘기면 그 경로가 버려진다.
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/auth/token/refresh`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: before.refreshToken }),
  });
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
