import type { Archive } from '@/features/archive/types';
import { useMyProfile } from '@/features/my/api/queries';
import { copyText, shareViaSystem } from '@/features/share/lib/shareUrl';
import { Icon24Link, Icon24More } from '@/shared/icons/NookIcons';
import { useToast } from '@/shared/toast';
import { COLOR_BG_CLASS, Drawer, DrawerContent, DrawerTitle, Thumbnail } from '@/shared/ui';

interface ShareSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 조립이 끝난 공유 URL. 발급 전에는 시트를 열지 않는다. */
  url: string;
  /** 프리뷰 카드용 — 공유하려는 아카이브 자신. */
  archive: Archive;
}

/**
 * Figma `공유 드로어`(138:6075) — 프리뷰 카드 + 공유 수단.
 * 카카오톡·스토리는 SDK 연동이 필요해 후속(§13) — 지금은 링크 복사와 OS 공유 시트만.
 */
export function ShareSheet({ open, onOpenChange, url, archive }: ShareSheetProps) {
  const { showToast } = useToast();
  // 프리뷰의 소유자 표기 — SHARED 는 원 소유자가 응답에 실려 오지만, 내 아카이브(OWNED)는
  // owner 필드가 없어 내 프로필 닉네임으로 채운다(게스트는 프로필 조회가 꺼져 있어 생략).
  const { data: myProfile } = useMyProfile();
  const ownerNickname = archive.owner?.nickname ?? myProfile?.nickname;

  const actions = [
    {
      label: '링크 복사',
      icon: <Icon24Link />,
      onSelect: async () => {
        const copied = await copyText(url);
        showToast({
          variant: 'simple',
          title: copied ? '링크를 복사했어요' : '링크를 복사하지 못했어요',
        });
        // 링크 복사는 시트 안에서 계속 다른 공유 수단을 고를 수 있게 닫지 않는다.
      },
    },
    {
      label: '더보기',
      icon: <Icon24More />,
      onSelect: async () => {
        const shared = await shareViaSystem({ title: archive.name, url });
        if (shared) onOpenChange(false);
      },
    },
  ];

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      {/* 탭바(z-60)보다 위 — 공유 시트가 열리면 딤과 함께 바텀내비를 덮는다(Figma 226:9568). */}
      <DrawerContent className="z-[70]" overlayClassName="z-[70]">
        <DrawerTitle className="sr-only">아카이브 공유</DrawerTitle>
        <div
          className="flex flex-col gap-6 p-4"
          style={{
            paddingBottom: 'max(2rem, calc(env(safe-area-inset-bottom) + 1rem))',
          }}
        >
          {/* 프리뷰 카드 — 받는 사람이 보게 될 아카이브 요약. */}
          <div className="mx-auto flex w-full max-w-60 flex-col overflow-hidden rounded-sm border border-gray-20 bg-gray-0">
            <Thumbnail size="fluid" src={archive.thumbnails?.[0]} alt="" />
            <div className="flex flex-col gap-1 p-3">
              <span className="flex items-center gap-1.5">
                <span
                  className={`size-2 shrink-0 ${COLOR_BG_CLASS[archive.color]}`}
                  aria-hidden="true"
                />
                <span className="truncate text-b2 font-medium text-gray-100">{archive.name}</span>
              </span>
              <span className="font-mono text-e2 text-gray-60">
                {ownerNickname ? `@${ownerNickname} • ` : ''}
                {archive.placeCount} Places
              </span>
            </div>
          </div>

          <div className="flex justify-center gap-6">
            {actions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={action.onSelect}
                className="flex flex-col items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100"
              >
                <span className="flex size-12 items-center justify-center rounded-full bg-gray-10">
                  {action.icon}
                </span>
                <span className="text-e1 text-gray-80">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
