import mySelected from '@/assets/icons/32_my_selected.svg';
import myUnselected from '@/assets/icons/32_my_unselected.svg';
import {
  Icon32GroupSelected,
  Icon32GroupUnselected,
  Icon32MapSelected,
  Icon32MapUnselected,
} from '@/shared/icons/NookIcons';
import type { BottomMenuItem } from '@/shared/ui';

function ImageIcon({ src }: { src: string }) {
  return <img src={src} alt="" className="size-8" aria-hidden="true" />;
}

export const bottomMenuItems: BottomMenuItem[] = [
  {
    to: '/map',
    label: 'map',
    icon: <Icon32MapUnselected />,
    activeIcon: <Icon32MapSelected />,
  },
  {
    to: '/group',
    label: 'group',
    icon: <Icon32GroupUnselected />,
    activeIcon: <Icon32GroupSelected />,
  },
  {
    to: '/my',
    label: 'my',
    icon: <ImageIcon src={myUnselected} />,
    activeIcon: <ImageIcon src={mySelected} />,
  },
];
