import type { BridgeMessage, SocialProvider } from './message';

export type WebToNative =
  | BridgeMessage<'WEB_READY', Record<string, never>>
  // 셸이 provider SDK 를 실행한다. 백엔드 인증과 세션 저장은 웹이 결과를 받아 이어서 처리한다.
  | BridgeMessage<'SOCIAL_LOGIN', { requestId: string; provider: SocialProvider }>
  | BridgeMessage<'OPEN_EXTERNAL_URL', { url: string }>
  | BridgeMessage<'REQUEST_PUSH_PERMISSION', Record<string, never>>
  | BridgeMessage<'SESSION_GET', { requestId: string }>
  | BridgeMessage<'SESSION_REFRESH', { requestId: string; revision: number }>
  | BridgeMessage<
      'SESSION_ESTABLISH',
      { requestId: string; accessToken: string; refreshToken: string | null }
    >
  | BridgeMessage<'SESSION_CLEAR', { requestId: string }>;
