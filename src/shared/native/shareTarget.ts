import { CapacitorShareTarget, type ShareReceivedEvent } from '@capgo/capacitor-share-target';
import { platform } from '@/shared/native/platform';

/**
 * 인스타그램 등 외부 앱의 "공유하기"로 들어오는 텍스트/링크 수신 어댑터.
 * 웹 dev 환경에서는 no-op (리스너 등록 자체를 하지 않음).
 */
export function onShareReceived(callback: (event: ShareReceivedEvent) => void) {
  if (!platform.isNative) {
    return () => {};
  }

  const handlePromise = CapacitorShareTarget.addListener('shareReceived', callback);

  return () => {
    handlePromise.then((handle) => handle.remove());
  };
}

export type { ShareReceivedEvent };
