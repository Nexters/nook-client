import {
  Icon32ArchiveSelected,
  Icon32ArchiveUnselected,
  Icon32MapSelected,
  Icon32MapUnselected,
  Icon32MySelected,
  Icon32MyUnselected,
} from '@/shared/icons/NookIcons';
import type { BottomMenuItem } from '@/shared/ui';

// 시안 `NAV` 기준 순서 — 왼쪽부터 archive / map / my.
export const bottomMenuItems: BottomMenuItem[] = [
  {
    to: '/archive',
    label: 'archive',
    icon: <Icon32ArchiveUnselected />,
    activeIcon: <Icon32ArchiveSelected />,
  },
  {
    to: '/map',
    label: 'map',
    icon: <Icon32MapUnselected />,
    activeIcon: <Icon32MapSelected />,
  },
  {
    to: '/my',
    label: 'my',
    icon: <Icon32MyUnselected />,
    activeIcon: <Icon32MySelected />,
  },
];
