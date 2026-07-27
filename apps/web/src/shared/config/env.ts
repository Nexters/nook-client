/**
 * 환경변수 접근 게이트. import.meta.env 를 직접 흩뿌리지 않고 여기서만 읽는다.
 *
 * BE 주소는 배포 환경별 `.env`(예: `.env.production`)로 주입한다.
 * 값이 없으면 로컬 기본값으로 폴백하되 dev 에서 경고 → 무설정으로도 빌드/테스트는 그린.
 */
const DEFAULT_API_BASE_URL = 'http://localhost:8080';

function readApiBaseUrl(): string {
  const value = import.meta.env.VITE_API_BASE_URL;
  if (!value) {
    if (import.meta.env.DEV) {
      console.warn(
        `[env] VITE_API_BASE_URL 미설정 — 기본값(${DEFAULT_API_BASE_URL}) 사용. .env 를 확인하세요.`,
      );
    }
    return DEFAULT_API_BASE_URL;
  }
  return value;
}

function readNaverMapClientId(): string {
  const value = import.meta.env.VITE_NAVER_MAP_CLIENT_ID;
  if (!value && import.meta.env.DEV) {
    console.warn(
      '[env] VITE_NAVER_MAP_CLIENT_ID 미설정 — 지도가 렌더링되지 않습니다. .env 를 확인하세요.',
    );
  }
  return value ?? '';
}

export const env = {
  apiBaseUrl: readApiBaseUrl(),
  naverMapClientId: readNaverMapClientId(),
  isDev: import.meta.env.DEV,
} as const;
