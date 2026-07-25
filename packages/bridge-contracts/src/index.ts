// 셸 ↔ 원격 웹 메시지 계약 (SSOT). web·mobile 양쪽이 이 타입을 참조한다.
// mobile(RN)에서는 import type 으로만 써서 Metro 번들에 포함되지 않는다.

import type { NativeToWeb } from './native-to-web';
import type { WebToNative } from './web-to-native';

export * from './message';
export type * from './native-to-web';
export type * from './web-to-native';

export type MessageType = NativeToWeb['type'] | WebToNative['type'];
