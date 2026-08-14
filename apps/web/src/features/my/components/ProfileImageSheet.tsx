import type { ImagePickSource } from '@nook/bridge-contracts';
import { Icon20Camera, Icon20Picture } from '@/shared/icons/NookIcons';
import { Drawer, DrawerContent, DrawerTitle } from '@/shared/ui';

/**
 * Figma `마이페이지 > 프로필 이미지 변경`.
 * 이미지 소스(앨범/카메라)를 고르는 바텀시트. 실제 픽커 실행은 호출부가 한다.
 */
export interface ProfileImageSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (source: ImagePickSource) => void;
}

const OPTIONS = [
  { source: 'album', label: '앨범에서 선택', icon: <Icon20Picture /> },
  { source: 'camera', label: '직접 촬영하기', icon: <Icon20Camera /> },
] as const;

export function ProfileImageSheet({ open, onOpenChange, onSelect }: ProfileImageSheetProps) {
  // 셸 컨테이너가 아니라 기본값(body)으로 포탈한다 — 페이지가 문서 흐름을 따라 셸이
  // 길어질 수 있어 셸 기준 fixed 는 위치가 틀어진다. 데스크톱 폭은 max-w 로 막는다.
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        className="mx-auto max-w-[450px] px-4 pt-2"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        <DrawerTitle className="sr-only">프로필 이미지 변경</DrawerTitle>
        {OPTIONS.map(({ source, label, icon }) => (
          <button
            key={source}
            type="button"
            onClick={() => onSelect(source)}
            className="flex h-14 items-center gap-4 rounded-sm text-left text-b1 font-medium text-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100"
          >
            <span aria-hidden="true">{icon}</span>
            {label}
          </button>
        ))}
      </DrawerContent>
    </Drawer>
  );
}
