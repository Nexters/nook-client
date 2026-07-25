import type { BridgeMessage } from './message';

export type WebToNative =
  | BridgeMessage<'WEB_READY', Record<string, never>>
  | BridgeMessage<'OPEN_EXTERNAL_URL', { url: string }>
  | BridgeMessage<'REQUEST_PUSH_PERMISSION', Record<string, never>>;
