import { requireNativeModule } from 'expo';

export interface StoredSession {
  schemaVersion: 1;
  accessToken: string;
  refreshToken: string | null;
  /**
   * 토큰을 발급한 API 의 루트. 웹이 자기 VITE_API_BASE_URL 을 절대 URL 로 풀어 넘긴 값이라
   * 버전 경로(/api/v1)가 없다 — 웹은 생성된 엔드포인트 경로가 그걸 이미 들고 있어서다.
   * 네이티브·공유 확장은 `/groups` 처럼 버전 없는 경로를 쓰므로 요청할 때 직접 붙인다.
   * null 이면 이 필드가 생기기 전에 저장된 세션이라 어디로 보낼지 알 수 없다.
   */
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
