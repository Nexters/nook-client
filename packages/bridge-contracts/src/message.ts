export const BRIDGE_VERSION = 1 as const;

export type Platform = 'ios' | 'android' | 'web';

export type SocialProvider = 'apple' | 'kakao';

export type ImagePickSource = 'album' | 'camera';

export interface BridgeMessage<Type extends string, Payload> {
  v: typeof BRIDGE_VERSION;
  type: Type;
  payload: Payload;
}
