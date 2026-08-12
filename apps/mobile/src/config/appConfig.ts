import Constants from 'expo-constants';

/**
 * app.config.ts 가 extra 로 주입한 값. 원본은 native-public-config.json 이고,
 * 로컬에서만 EXPO_PUBLIC_* 로 덮어쓸 수 있다.
 * 공유 확장이 읽는 Info.plist 값도 같은 출처라 셸과 확장이 어긋나지 않는다.
 */
interface NookExtra {
  webUrl?: string;
  apiBaseUrl?: string;
}

const extra = (Constants.expoConfig?.extra ?? {}) as NookExtra;

// 값이 비면 앱이 아무것도 못 하므로 시작 시점에 끊는다.
function required(value: string | undefined, key: keyof NookExtra): string {
  if (!value) {
    throw new Error(`app config 에 ${key} 가 없다 — native-public-config.json 을 확인해라`);
  }
  return value;
}

export const WEB_URL = required(extra.webUrl, 'webUrl');
export const API_BASE_URL = required(extra.apiBaseUrl, 'apiBaseUrl');
