import { nativeBridge } from '@/native-bridge';

/**
 * 가입 직후 1회 온보딩의 열람 여부.
 *
 * 앱(WebView)에서만 띄운다 — 브라우저는 자동 온보딩 대상이 아니다.
 * 저장처는 localStorage 라 WebView 가 보는 웹 오리진에 묶인다. 배포 주소
 * (`EXPO_PUBLIC_WEB_URL`)가 바뀌면 값이 사라져 기존 사용자에게 한 번 더 뜬다 — 네이티브
 * 저장소(AsyncStorage)를 들이지 않는 대가로 받아들인 트레이드오프다.
 */
const KEY = 'onboarding_guide_seen';

/** 앱에서, 아직 안 본 사람에게만 true. 판정이 동기라 진입이 한 프레임도 지연되지 않는다. */
export function shouldShowOnboarding(): boolean {
  return nativeBridge.isNative && read() !== 'true';
}

export function markOnboardingSeen(): void {
  try {
    localStorage.setItem(KEY, 'true');
  } catch {
    // 무시 — 온보딩이 한 번 더 뜨는 것이 최악이다.
  }
}

// 쿠키 차단·프라이빗 모드에서는 접근만으로도 던진다. 읽기 실패는 "봤음" 으로 접는다 —
// 매 진입마다 온보딩이 다시 뜨는 것보다 낫다.
function read(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return 'true';
  }
}
