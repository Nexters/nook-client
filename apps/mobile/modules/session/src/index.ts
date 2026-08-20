import { requireNativeModule } from 'expo';

export interface StoredSession {
  schemaVersion: 1;
  accessToken: string;
  refreshToken: string | null;
  /** 토큰을 발급한 API 오리진(/api/v1 포함). 이 값이 있으면 갱신·공유 확장 요청이 여기로 나간다. */
  apiBaseUrl: string | null;
  revision: number;
}

interface NookSessionNativeModule {
  getSession(): Promise<StoredSession | null>;
  setSession(
    accessToken: string,
    refreshToken: string | null,
    apiBaseUrl: string | null,
  ): Promise<StoredSession>;
  clearSession(): Promise<void>;
}

export default requireNativeModule<NookSessionNativeModule>('NookSession');
