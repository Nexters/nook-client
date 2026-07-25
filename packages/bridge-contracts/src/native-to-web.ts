import type { BridgeMessage } from './message';

export type NativeToWeb = BridgeMessage<'APP_RESUMED', Record<string, never>>;
