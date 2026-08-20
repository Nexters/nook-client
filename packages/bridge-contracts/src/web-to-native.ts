import type { BridgeMessage, ImagePickSource, SocialProvider } from './message';

export type WebToNative =
  | BridgeMessage<'WEB_READY', Record<string, never>>
  // 셸이 provider SDK 를 실행한다. 백엔드 인증과 세션 저장은 웹이 결과를 받아 이어서 처리한다.
  | BridgeMessage<'SOCIAL_LOGIN', { requestId: string; provider: SocialProvider }>
  // 셸이 앨범/카메라를 열어 이미지를 고른다. 업로드와 저장은 웹이 결과를 받아 이어서 처리한다.
  | BridgeMessage<'IMAGE_PICK', { requestId: string; source: ImagePickSource }>
  | BridgeMessage<'OPEN_EXTERNAL_URL', { url: string }>
  // BACK_REQUESTED 를 받았지만 웹에 더 돌아갈 곳이 없다. 셸이 OS 기본 동작(앱 내리기)을 한다.
  | BridgeMessage<'BACK_EXHAUSTED', Record<string, never>>
  | BridgeMessage<'REQUEST_PUSH_PERMISSION', { requestId: string }>
  // iOS 엣지 스와이프 뒤로가기를 화면 단위로 켜고 끈다. 셸의 제스처는 WebView 전역 prop 이라
  // 웹에서 화면별로 막을 수 없는데, "헤더 좌상단에 뒤로가기 버튼이 있는 화면인가"는 웹만
  // 안다 — 그 판정을 웹이 내려 셸에 알린다(제품 규칙: 그런 화면에서만 스와이프된다).
  // 히스토리는 건드리지 않아 버튼 뒤로가기·Android 하드웨어 백에는 영향이 없다.
  // 구버전 셸은 파서의 default 분기에서 null 로 떨어뜨려 조용히 무시한다.
  | BridgeMessage<'SET_BACK_GESTURE', { enabled: boolean }>
  // apiBaseUrl 은 웹이 토큰을 발급받은 API 루트(버전 경로 제외). 셸·확장이 저장된 토큰을 같은 곳으로
  // 보내게 세션에 함께 기록한다. 구버전 웹은 안 보내므로 null 을 허용한다.
  | BridgeMessage<'SESSION_GET', { requestId: string; apiBaseUrl: string | null }>
  | BridgeMessage<'SESSION_REFRESH', { requestId: string; revision: number }>
  | BridgeMessage<
      'SESSION_ESTABLISH',
      {
        requestId: string;
        accessToken: string;
        refreshToken: string | null;
        apiBaseUrl: string | null;
      }
    >
  | BridgeMessage<'SESSION_CLEAR', { requestId: string }>;
