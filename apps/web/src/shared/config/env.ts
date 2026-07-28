/**
 * 환경변수 접근 게이트. import.meta.env 를 직접 흩뿌리지 않고 여기서만 읽는다.
 *
 * BE 주소는 배포 환경별 `.env`(예: `.env.production`)로 주입한다.
 * 값이 없으면 잘못된 설정으로 간주해 즉시 실패한다.
 */
function readApiBaseUrl(): string {
  const value = import.meta.env.VITE_API_BASE_URL;
  if (!value) {
    console.warn('[env] VITE_API_BASE_URL 미설정 - API 요청을 사용할 수 없습니다.');
  }
  return value ?? '';
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
