import type { ImagePickSource } from '@nook/bridge-contracts';
import { useAppShellContainer } from '@/app/providers';
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
  // 셸(모바일 폭) 안으로 포탈한다 — 기본값인 body 포탈이면 뷰포트 전체 폭으로 펼쳐진다.
  const shellContainer = useAppShellContainer();

  return (
    <Drawer open={open} onOpenChange={onOpenChange} container={shellContainer}>
      <DrawerContent
        className="px-4 pt-2"
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
