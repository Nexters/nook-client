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
  posthogKey: import.meta.env.VITE_PUBLIC_POSTHOG_KEY ?? '',
  posthogHost: import.meta.env.VITE_PUBLIC_POSTHOG_HOST ?? '',
  isDev: import.meta.env.DEV,
  enableDevRoutes: import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEV_ROUTES === 'true',
  /**
   * 지도 바텀시트의 "저장한 공간 검색" — 서버 검색 API 연동 전이라 배포에선 숨긴다.
   * 진입점(검색 아이콘)만 이 플래그로 가리면 검색 UI 전체가 함께 숨는다.
   * 연동이 끝나면 이 값을 `true` 로 바꾸는 것이 켜는 스위치다.
   */
  enablePlaceSearch: import.meta.env.DEV,
  /**
   * 공유 링크에 쓰는 웹 오리진. 셸 웹뷰에서도 링크는 항상 공개 웹 주소여야 하므로
   * 배포 환경 변수로 고정하고, 미설정 시(로컬 등) 현재 오리진으로 대체한다.
   */
  webOrigin: import.meta.env.VITE_WEB_ORIGIN || window.location.origin,
} as const;
