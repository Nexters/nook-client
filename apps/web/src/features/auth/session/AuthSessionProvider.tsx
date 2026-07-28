import type { SessionStatus } from '@nook/bridge-contracts';
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { queryClient } from '@/app/queryClient';
import { nativeBridge } from '@/native-bridge';
import { apiClient } from '@/shared/api/http';

interface SessionState {
  status: SessionStatus;
  accessToken: string | null;
  revision: number;
}

interface SessionContextValue extends SessionState {
  clear(): Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>({
    status: nativeBridge.isNative ? 'bootstrapping' : 'anonymous',
    accessToken: null,
    revision: 0,
  });

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
        void queryClient.cancelQueries();
        queryClient.clear();
        setSession({ status: 'anonymous', accessToken: null, revision: 0 });
      }
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    apiClient.setAccessTokenProvider(() => session.accessToken);
    apiClient.setSessionRefresher(
      nativeBridge.isNative
        ? async () => {
            const result = await nativeBridge.requestSession('SESSION_REFRESH', session.revision);
            setSession({
              status: result.status,
              accessToken: result.accessToken ?? null,
              revision: result.revision ?? 0,
            });
            return result.accessToken ?? null;
          }
        : undefined,
    );
  }, [session.accessToken, session.revision]);

  const value = useMemo<SessionContextValue>(
    () => ({
      ...session,
      clear: async () => {
        if (nativeBridge.isNative) await nativeBridge.requestSession('SESSION_CLEAR');
        await queryClient.cancelQueries();
        queryClient.clear();
        setSession({ status: 'anonymous', accessToken: null, revision: 0 });
      },
    }),
    [session],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useAuthSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('AuthSessionProvider가 필요합니다.');
  return value;
}
