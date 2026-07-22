import { Geolocation } from '@capacitor/geolocation';

export type Coordinates = { lat: number; lng: number };

/**
 * 위치 권한 요청 + 현재 좌표 조회를 감싸는 어댑터.
 * 권한 거부/미지원/오류 시 null 을 반환해 호출부가 조용히(다이얼로그 없이) 처리하게 한다.
 */
export async function getCurrentPosition(): Promise<Coordinates | null> {
  try {
    const permission = await Geolocation.checkPermissions();
    if (permission.location !== 'granted') {
      try {
        const requested = await Geolocation.requestPermissions();
        if (requested.location !== 'granted') {
          return null;
        }
      } catch {
        // 웹은 requestPermissions 가 미구현(unimplemented)이라 여기서 던진다.
        // 웹은 getCurrentPosition 호출 자체가 브라우저 권한 프롬프트를 띄우므로 그대로 진행한다.
      }
    }
    const position = await Geolocation.getCurrentPosition();
    return { lat: position.coords.latitude, lng: position.coords.longitude };
  } catch {
    return null;
  }
}
