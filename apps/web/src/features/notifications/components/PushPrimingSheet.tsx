import { useEffect, useState } from 'react';
import { registerPushToken } from '@/features/notifications/api/pushTokens';
import { nativeBridge } from '@/native-bridge';
import { Button, ButtonGroup, Drawer, DrawerContent, DrawerTitle } from '@/shared/ui';

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

  // Figma 330:14309 (NOOK-336) — 가운데 정렬 문구 + `2Button_52`(나중에 | 알림 받기).
  return (
    <Drawer open={open} onOpenChange={(next) => !next && close()}>
      <DrawerContent
        className="mx-auto max-w-[450px]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <DrawerTitle className="sr-only">알림 받기 안내</DrawerTitle>
        <div className="flex flex-col items-center gap-3 px-2.5 pt-6 pb-8 text-center">
          <p className="text-h2 font-semibold text-gray-100">저장이 완료되면 알려드릴까요?</p>
          <p className="text-b2 font-medium text-gray-80">
            알림 설정은 My<span className="text-b3">→</span>설정에서 다시 변경할 수 있어요.
          </p>
        </div>
        <ButtonGroup size="lg" className="p-4">
          {/* 시안의 Secondary 는 gray-20 바탕이라 공용 secondary(gray-60)를 여기서만 덮는다. */}
          <Button
            variant="secondary"
            size="lg"
            onClick={close}
            className="bg-gray-20 text-gray-90 hover:bg-gray-30 active:bg-gray-30"
          >
            나중에
          </Button>
          <Button size="lg" onClick={handleAllow}>
            알림 받기
          </Button>
        </ButtonGroup>
      </DrawerContent>
    </Drawer>
  );
}
