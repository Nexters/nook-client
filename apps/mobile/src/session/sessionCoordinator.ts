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

export async function restoreSession(): Promise<StoredSession | null> {
  return NookSession.getSession();
}

export async function establishSession(
  accessToken: string,
  refreshToken: string | null,
): Promise<StoredSession> {
  generation += 1;
  return NookSession.setSession(accessToken, refreshToken);
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
  // API_BASE_URL 은 웹과 같이 /api/v1 까지 포함한다. 절대 경로로 넘기면 그 경로가 버려진다.
  const response = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/auth/token/refresh`, {
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
  return establishSession(tokens.accessToken, tokens.refreshToken);
}
