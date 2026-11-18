import type { Archive } from '@/features/archive/types';
import { useMyProfile } from '@/features/my/api/queries';
import type { PostDetail } from '@/features/post/types';
import { copyText, shareViaSystem } from '@/features/share/lib/shareUrl';
import { Icon24Link, Icon24More } from '@/shared/icons/NookIcons';
import { useToast } from '@/shared/toast';
import type { ArchiveColor } from '@/shared/ui';
import { COLOR_BG_CLASS, Drawer, DrawerContent, DrawerTitle, Thumbnail } from '@/shared/ui';

interface ShareSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 조립이 끝난 공유 URL. 발급 전에는 시트를 열지 않는다. */
  url: string;
  /** 프리뷰 카드 — 받는 사람이 보게 될 요약. 아카이브는 `archiveSharePreview` 로 만든다. */
  preview: SharePreview;
  /** 스크린 리더용 시트 제목. */
  title?: string;
}

export interface SharePreview {
  name: string;
  thumbnail?: string;
  /** 아카이브 색 — 있으면 이름 앞에 색 점을 찍는다(게시물은 없다). */
  color?: ArchiveColor;
  /** 비우면 내 프로필 닉네임으로 채운다(내 아카이브·내 게시물). */
  ownerNickname?: string;
  placeCount: number;
}

/** 게시물 프리뷰 — 커버는 첫 미디어. 영상은 포스터가 있을 때만 쓴다(`<img>` 에 영상 URL 은 안 그려진다). */
export function postSharePreview({ title, post, places }: PostDetail): SharePreview {
  const first = post.media?.[0];
  return {
    name: title,
    thumbnail: first
      ? (first.thumbnailUrl ?? (first.type === 'IMAGE' ? first.url : undefined))
      : post.thumbnail,
    placeCount: places.length,
  };
}

export function archiveSharePreview(archive: Archive): SharePreview {
  return {
    name: archive.name,
    thumbnail: archive.thumbnails?.[0],
    color: archive.color,
    ownerNickname: archive.owner?.nickname,
    placeCount: archive.placeCount,
  };
}

/**
 * Figma `공유 드로어`(138:6075) — 프리뷰 카드 + 공유 수단.
 * 프리뷰 카드는 279:10740 기준으로 갱신했다(가로형 커버 + 8px 캡션).
 * 카카오톡·스토리는 SDK 연동이 필요해 후속(§13) — 지금은 링크 복사와 OS 공유 시트만.
 */
export function ShareSheet({
  open,
  onOpenChange,
  url,
  preview,
  title = '아카이브 공유',
}: ShareSheetProps) {
  const { showToast } = useToast();
  // 프리뷰의 소유자 표기 — SHARED 아카이브는 원 소유자가 응답에 실려 오지만, 내 아카이브·내 게시물은
  // 소유자가 없어 내 프로필 닉네임으로 채운다(게스트는 프로필 조회가 꺼져 있어 생략).
  const { data: myProfile } = useMyProfile();
  const ownerNickname = preview.ownerNickname ?? myProfile?.nickname;

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
        const shared = await shareViaSystem({ title: preview.name, url });
        if (shared) onOpenChange(false);
      },
    },
  ];

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      {/* 탭바(z-60)보다 위 — 공유 시트가 열리면 딤과 함께 바텀내비를 덮는다(Figma 226:9568). */}
      <DrawerContent className="z-[70]" overlayClassName="z-[70]">
        <DrawerTitle className="sr-only">{title}</DrawerTitle>
        <div
          className="flex flex-col gap-6 p-4"
          style={{
            paddingBottom: 'max(2rem, calc(env(safe-area-inset-bottom) + 1rem))',
          }}
        >
          {/* 프리뷰 카드 — 받는 사람이 보게 될 아카이브 요약(Figma 279:10740).
              커버는 카드 안에 꽉 차는 가로형이라, Thumbnail 이 기본으로 갖는
              테두리·라운드는 지운다(카드 자신의 테두리와 겹쳐 이중선이 된다). */}
          <div className="mx-auto flex w-full max-w-55 flex-col overflow-hidden rounded-xl border border-gray-20 bg-gray-0">
            <Thumbnail
              size="wide"
              src={preview.thumbnail}
              alt=""
              className="rounded-none border-0"
            />
            <div className="flex flex-col p-2">
              <span className="flex items-center gap-1.5">
                {preview.color ? (
                  <span
                    className={`size-1.5 shrink-0 ${COLOR_BG_CLASS[preview.color]}`}
                    aria-hidden="true"
                  />
                ) : null}
                <span className="truncate text-b3 font-semibold text-gray-100">{preview.name}</span>
              </span>
              <span className="flex items-center gap-1 text-s1 text-gray-40">
                {ownerNickname ? (
                  <>
                    <span className="truncate">@{ownerNickname}</span>
                    <span
                      className="size-0.5 shrink-0 rounded-full bg-gray-40"
                      aria-hidden="true"
                    />
                  </>
                ) : null}
                <span className="shrink-0">{preview.placeCount} Places</span>
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
