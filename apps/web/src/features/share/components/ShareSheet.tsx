import { copyText } from '@/features/share/lib/shareUrl';
import { useToast } from '@/shared/toast';
import { Button, Drawer, DrawerContent, DrawerTitle } from '@/shared/ui';

interface ShareSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 조립이 끝난 공유 URL. 발급 전에는 시트를 열지 않는다. */
  url: string;
}

/** 공유 수단은 우선 링크 복사만 — 카카오/OS 시트는 이 컴포넌트에 항목만 늘리면 된다. */
export function ShareSheet({ open, onOpenChange, url }: ShareSheetProps) {
  const { showToast } = useToast();

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerTitle className="px-4 pt-2 text-b1 font-semibold text-gray-100">
          아카이브 공유
        </DrawerTitle>
        <div className="flex flex-col gap-4 p-4 pb-8">
          <p className="break-all rounded-sm bg-gray-10 p-3 font-mono text-e1 text-gray-80">
            {url}
          </p>
          <Button
            size="lg"
            fullWidth
            onClick={async () => {
              const copied = await copyText(url);
              showToast({
                variant: 'simple',
                title: copied ? '링크를 복사했어요' : '링크를 복사하지 못했어요',
              });
              if (copied) onOpenChange(false);
            }}
          >
            링크 복사
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
