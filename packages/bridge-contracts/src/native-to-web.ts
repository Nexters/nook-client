import type { BridgeMessage } from './message';

export type SessionStatus = 'bootstrapping' | 'authenticated' | 'anonymous';

export type NativeToWeb =
  | BridgeMessage<'APP_RESUMED', Record<string, never>>
  | BridgeMessage<
      'SESSION_RESULT',
      { requestId: string; status: SessionStatus; accessToken?: string; revision?: number }
    >
  | BridgeMessage<'SESSION_CLEARED', { reason: string }>;
