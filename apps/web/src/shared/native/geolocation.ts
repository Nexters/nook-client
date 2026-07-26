export type Coordinates = { lat: number; lng: number };

/**
 * 브라우저 Geolocation API 를 감싼 어댑터.
 * 권한 거부/미지원/오류 시 null 을 반환해 호출부가 조용히(다이얼로그 없이) 처리하게 한다.
 *
 * Expo(RN) 셸에서는 WebView 가 이 API 를 그대로 프록시한다(Android: WebView
 * `geolocationEnabled` prop, iOS: WKWebView 가 Info.plist 권한 설명을 보고 자체
 * 처리) — 네이티브 브리지 메시지 없이 웹 표준 API 만으로 동작한다.
 */
export function getCurrentPosition(): Promise<Coordinates | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({ lat: position.coords.latitude, lng: position.coords.longitude });
      },
      () => {
        resolve(null);
      },
    );
  });
}
