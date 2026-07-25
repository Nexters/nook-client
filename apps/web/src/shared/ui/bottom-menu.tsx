import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/shared/lib/utils';

/** Figma "NAV" 컴포넌트 셋(지도/마이페이지/그룹 variant) 기준 하단 탭바. */
export interface BottomMenuItem {
  to: string;
  label: string;
  /** 비활성 상태 아이콘 (h-8 w-8 기준으로 그려진 아이콘을 전달) */
  icon: ReactNode;
  /** 활성 상태 아이콘. 생략하면 icon 을 그대로 사용한다. */
  activeIcon?: ReactNode;
  /** react-router NavLink 의 end prop 그대로 전달 (경로 정확 일치 판정용) */
  end?: boolean;
}

export interface BottomMenuProps {
  items: BottomMenuItem[];
  className?: string;
}

function BottomMenu({ items, className }: BottomMenuProps) {
  return (
    <nav
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 flex border-t border-gray-10 bg-gray-0 pb-[env(safe-area-inset-bottom)]',
        className,
      )}
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className="flex h-[65px] flex-1 flex-col items-center justify-center gap-1"
        >
          {({ isActive }) => (
            <>
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center',
                  isActive ? 'text-gray-100' : 'text-gray-50',
                )}
              >
                {isActive && item.activeIcon ? item.activeIcon : item.icon}
              </span>
              <span
                className={cn('font-mono text-e2', isActive ? 'text-gray-100' : 'text-gray-50')}
              >
                {item.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export { BottomMenu };
