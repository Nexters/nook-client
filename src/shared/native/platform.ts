import { Capacitor } from '@capacitor/core';

/**
 * 네이티브 접점 격리 지점.
 *
 * features 는 `@capacitor/*` 를 직접 import 하지 않고 이 모듈(및 앞으로 여기 추가될
 * 얇은 어댑터)만 사용한다. 웹 dev(브라우저)에서는 isNative=false 로 안전하게 no-op.
 * 후속 share-intake 계획의 공유 수신/딥링크 어댑터가 여기에 얹힌다.
 */
export const platform = {
  isNative: Capacitor.isNativePlatform(),
  name: Capacitor.getPlatform() as 'ios' | 'android' | 'web',
} as const;
