// 셸 ↔ 원격 웹 메시지 계약 (SSOT). web·mobile 양쪽이 이 타입을 참조한다.
// mobile(RN)에서는 import type 으로만 써서 Metro 번들에 포함되지 않는다.

export const BRIDGE_VERSION = 1 as const;

export type Platform = 'ios' | 'android' | 'web';

export interface SharedItem {
  text: string;
  groups?: string[];
  memo?: string;
  savedAt?: number;
}

// Native → Web
export type NativeToWeb =
  | { v: number; type: 'SHARE_RECEIVED'; payload: { items: SharedItem[] } }
  | { v: number; type: 'APP_RESUMED'; payload: Record<string, never> };

// Web → Native
export type WebToNative =
  | { v: number; type: 'WEB_READY'; payload: Record<string, never> }
  | { v: number; type: 'OPEN_EXTERNAL_URL'; payload: { url: string } }
  | { v: number; type: 'REQUEST_PUSH_PERMISSION'; payload: Record<string, never> };

export type MessageType = NativeToWeb['type'] | WebToNative['type'];
