import Constants from 'expo-constants';

/**
 * app.config.ts 가 extra 로 주입한 값. 원본은 native-public-config.json 이고,
 * 로컬에서만 EXPO_PUBLIC_* 로 덮어쓸 수 있다.
 * API 주소는 여기 없다 — 웹이 세션에 실어 주는 값만 쓴다 (modules/session 참고).
 */
interface NookExtra {
  webUrl?: string;
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

/**
 * app.json 의 `version` — 스토어에 노출되는 마케팅 버전이다.
 * URL 들과 달리 없다고 앱이 못 도는 값은 아니라서, 비면 웹이 버전 표기를 숨기게 둔다.
 */
export const APP_VERSION = Constants.expoConfig?.version ?? '';
