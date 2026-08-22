import type { SessionStatus } from '@nook/bridge-contracts';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { queryClient } from '@/app/queryClient';
import { nativeBridge } from '@/native-bridge';
import { apiClient } from '@/shared/api/http';
import { env } from '@/shared/config/env';

interface SessionState {
  status: SessionStatus;
  accessToken: string | null;
  revision: number;
}

interface SessionContextValue extends SessionState {
  establish(accessToken: string, refreshToken?: string | null): Promise<void>;
  clear(): Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);
const DEV_WEB_SESSION_KEY = 'nook.dev.session.v1';

// 셸·공유 확장이 저장된 토큰을 발급처와 같은 API 로 보내도록 세션에 함께 기록하는 값.
// 버전 경로(`/api/v1`)는 붙이지 않는다 — 생성된 엔드포인트 경로가 이미 들고 있어서고,
// 네이티브·확장은 자기 경로 관례에 맞춰 직접 붙인다.
// 로컬 개발의 vite 프록시 같은 상대 경로는 현재 오리진 기준의 절대 URL 로 풀어서 넘긴다 —
// 확장은 웹 오리진을 모르는 별도 프로세스라 상대 경로를 해석할 수 없다.
const SESSION_API_BASE_URL = env.apiBaseUrl
  ? new URL(env.apiBaseUrl, window.location.origin).toString()
  : null;

const anonymousSession: SessionState = {
  status: 'anonymous',
  accessToken: null,
  revision: 0,
};

function restoreDevWebSession(): SessionState {
  if (nativeBridge.isNative) {
    return { ...anonymousSession, status: 'bootstrapping' };
  }
  if (!env.enableDevRoutes) return anonymousSession;

  try {
    const storedSession = localStorage.getItem(DEV_WEB_SESSION_KEY);
    if (!storedSession) return anonymousSession;

    const parsed = JSON.parse(storedSession) as { accessToken?: unknown };
    if (typeof parsed.accessToken !== 'string' || !parsed.accessToken.trim()) {
      localStorage.removeItem(DEV_WEB_SESSION_KEY);
      return anonymousSession;
    }

    return {
      status: 'authenticated',
      accessToken: parsed.accessToken,
      revision: 1,
    };
  } catch {
    try {
      localStorage.removeItem(DEV_WEB_SESSION_KEY);
    } catch {
      // 저장소 접근이 차단된 브라우저에서는 익명 세션으로 시작합니다.
    }
    return anonymousSession;
  }
}

function saveDevWebSession(accessToken: string) {
  try {
    localStorage.setItem(DEV_WEB_SESSION_KEY, JSON.stringify({ accessToken }));
  } catch {
    throw new Error('브라우저에 테스트 세션을 저장하지 못했습니다.');
  }
}

function clearDevWebSession() {
  if (!env.enableDevRoutes) return;
  try {
    localStorage.removeItem(DEV_WEB_SESSION_KEY);
  } catch {
    // 메모리의 세션은 아래에서 계속 제거합니다.
  }
}

// React 는 자식 effect 를 부모보다 먼저 실행한다. 토큰 주입을 effect 에 두면 자식의 첫 요청이
// 토큰 없이 나가 AUTH_REQUIRED 로 끊긴다 — fetch 이전이라 네트워크 탭에도 안 잡힌다.
// nativeBridge.start() 와 같은 이유로 렌더 중에 끝낸다.
let currentSession: SessionState = anonymousSession;
apiClient.setAccessTokenProvider(() => currentSession.accessToken);

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>(restoreDevWebSession);
  currentSession = session;

  const resetToAnonymous = useCallback(async () => {
    currentSession = anonymousSession;
    await queryClient.cancelQueries();
    queryClient.clear();
    setSession(anonymousSession);
  }, []);

  useEffect(() => {
    if (!nativeBridge.isNative) return;
    let active = true;
    nativeBridge.requestSession('SESSION_GET', SESSION_API_BASE_URL).then((result) => {
      if (!active) return;
      setSession({
        status: result.status,
        accessToken: result.accessToken ?? null,
        revision: result.revision ?? 0,
      });
    });
    const unsubscribe = nativeBridge.on((message) => {
      if (message.type === 'SESSION_CLEARED') {
        void resetToAnonymous();
      }
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [resetToAnonymous]);

  useEffect(() => {
    // 401 응답 이후에만 쓰이므로 effect 로 충분하다. revision 은 호출 시점 값을 읽는다.
    apiClient.setSessionRefresher(
      nativeBridge.isNative
        ? async () => {
            try {
              const result = await nativeBridge.requestSession(
                'SESSION_REFRESH',
                currentSession.revision,
              );
              if (result.status !== 'authenticated' || !result.accessToken) {
                await resetToAnonymous();
                return null;
              }

              const refreshedSession: SessionState = {
                status: 'authenticated',
                accessToken: result.accessToken,
                revision: result.revision ?? 0,
              };
              currentSession = refreshedSession;
              setSession(refreshedSession);
              return refreshedSession.accessToken;
            } catch (error) {
              await resetToAnonymous();
              throw error;
            }
          }
        : undefined,
    );
  }, [resetToAnonymous]);

  const value = useMemo<SessionContextValue>(
    () => ({
      ...session,
      establish: async (accessToken, refreshToken = null) => {
        if (!nativeBridge.isNative) {
          if (!env.enableDevRoutes) {
            throw new Error('개발 환경에서만 테스트 세션을 저장할 수 있습니다.');
          }

          await queryClient.cancelQueries();
          queryClient.clear();
          saveDevWebSession(accessToken);
          setSession({ status: 'authenticated', accessToken, revision: 1 });
          return;
        }

        await queryClient.cancelQueries();
        queryClient.clear();
        const result = await nativeBridge.requestSession(
          'SESSION_ESTABLISH',
          accessToken,
          refreshToken,
          SESSION_API_BASE_URL,
        );
        if (result.status !== 'authenticated' || !result.accessToken) {
          throw new Error('세션을 저장하지 못했습니다.');
        }
        setSession({
          status: result.status,
          accessToken: result.accessToken,
          revision: result.revision ?? 0,
        });
      },
      clear: async () => {
        if (nativeBridge.isNative) await nativeBridge.requestSession('SESSION_CLEAR');
        else clearDevWebSession();
        await resetToAnonymous();
      },
    }),
    [resetToAnonymous, session],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useAuthSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('AuthSessionProvider가 필요합니다.');
  return value;
}

/**
 * 계정 API 를 호출해도 되는 상태인지. 게스트도 앱을 둘러볼 수 있게 되면서 계정 쿼리가
 * 토큰 없이 실행될 수 있는데, 그 요청들은 `auth: 'required'` 라 네트워크도 타지 않고
 * 바로 던진다 — 화면에는 "불러오지 못했어요" 만 남는다. 조회 훅의 `enabled` 에 걸어
 * 애초에 실행되지 않게 한다.
 *
 * `useAuthSession` 과 달리 프로바이더가 없어도 던지지 않는다. 화면 조각만 떼어 렌더하는
 * 단위 테스트가 많은데, 그 테스트들이 검증하는 건 세션이 아니라서 세션 설정까지 지고
 * 가게 만들 이유가 없다. 실제 앱에서는 프로바이더가 항상 있고(App.tsx), 없으면 라우트
 * 가드의 `useAuthSession` 이 먼저 던지므로 이 폴백이 진짜 설정 누락을 가리지 못한다.
 */
export function useIsAuthenticated(): boolean {
  return useContext(SessionContext)?.status !== 'anonymous';
}
