import {
  Icon32GroupSelected,
  Icon32GroupUnselected,
  Icon32MapSelected,
  Icon32MapUnselected,
  Icon32MySelected,
  Icon32MyUnselected,
} from '@/shared/icons/NookIcons';
import type { BottomMenuItem } from '@/shared/ui';

// 시안 `NAV` 기준 순서 — 왼쪽부터 group / map / my.
export const bottomMenuItems: BottomMenuItem[] = [
  {
    to: '/group',
    label: 'group',
    icon: <Icon32GroupUnselected />,
    activeIcon: <Icon32GroupSelected />,
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
