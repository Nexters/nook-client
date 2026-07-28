import type { BridgeMessage } from './message';

export type WebToNative =
  | BridgeMessage<'WEB_READY', Record<string, never>>
  | BridgeMessage<'OPEN_EXTERNAL_URL', { url: string }>
  | BridgeMessage<'REQUEST_PUSH_PERMISSION', Record<string, never>>
  | BridgeMessage<'SESSION_GET', { requestId: string }>
  | BridgeMessage<'SESSION_REFRESH', { requestId: string; revision: number }>
  | BridgeMessage<
      'SESSION_ESTABLISH',
      { requestId: string; accessToken: string; refreshToken: string | null }
    >
  | BridgeMessage<'SESSION_CLEAR', { requestId: string }>;
