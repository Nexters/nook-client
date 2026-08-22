import { useEffect, useState } from 'react';
import { registerPushToken } from '@/features/notifications/api/pushTokens';
import { nativeBridge } from '@/native-bridge';
import { Button, Drawer, DrawerContent, DrawerTitle } from '@/shared/ui';

// "나중에"를 고른 사용자에게 같은 세션 안에서 다시 묻지 않는다. 앱을 새로 켜고
// 또 오래 걸리는 저장을 만나면 그때 다시 노출된다 — OS 다이얼로그는 한 번 거부되면
// 되돌릴 수 없어서, 인앱 단계에서 이 정도 재시도 여지는 남겨둔다.
let dismissedThisSession = false;

/**
 * 알림 권한 사전 안내(프라이밍) 시트. `active`(게시물이 백그라운드 처리에 들어감)가
 * 켜졌을 때, 권한이 아직 미결정인 사용자에게만 뜬다 — 즉시 완료되는 저장(이미 DB 에
 * 있는 게시물)은 처리 상태를 거치지 않아 자연히 안 뜬다. OS 다이얼로그는 사용자가
 * "알림 받기"를 눌러 맥락을 인지한 뒤에만 띄운다(심사 가이드라인 대응).
 */
export function PushPrimingSheet({ active }: { active: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!active || !nativeBridge.isNative || dismissedThisSession) return;
    let cancelled = false;
    void nativeBridge.requestPushStatus().then((result) => {
      if (cancelled || result.status !== 'undetermined') return;
      setOpen(true);
    });
    return () => {
      cancelled = true;
    };
  }, [active]);

  const close = () => {
    dismissedThisSession = true;
    setOpen(false);
  };

  const handleAllow = () => {
    close();
    void nativeBridge.requestPushPermission().then((result) => {
      if (result.token) void registerPushToken(result.token).catch(() => undefined);
    });
  };

  return (
    <Drawer open={open} onOpenChange={(next) => !next && close()}>
      <DrawerContent
        className="mx-auto max-w-[450px] px-4 pt-2"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        <DrawerTitle className="sr-only">알림 받기 안내</DrawerTitle>
        <div className="flex flex-col gap-1 py-2">
          <p className="text-h2 font-semibold text-gray-100">저장이 끝나면 알려드릴까요?</p>
          <p className="text-b2 text-gray-60">
            게시물 정리에 시간이 조금 걸려요. 완료되면 푸시 알림으로 알려드려요.
          </p>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <Button size="lg" fullWidth onClick={handleAllow}>
            알림 받기
          </Button>
          <button
            type="button"
            onClick={close}
            className="h-11 rounded-sm text-b2 font-medium text-gray-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100"
          >
            나중에
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
