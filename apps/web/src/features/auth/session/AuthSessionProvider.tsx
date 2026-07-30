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
    nativeBridge.requestSession('SESSION_GET').then((result) => {
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
