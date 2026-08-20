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
  | BridgeMessage<'REQUEST_PUSH_PERMISSION', Record<string, never>>
  // apiBaseUrl 은 웹이 토큰을 발급받은 API 오리진. 셸·확장이 저장된 토큰을 같은 곳으로
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
