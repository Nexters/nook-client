import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/shared/lib/utils';

/**
 * BottomMenu 의 렌더링 높이(60px 탭 행 + 하단 safe-area).
 * 다른 fixed 요소(예: 지도 바텀시트)가 이 위에 겹치지 않고 쌓이려면 이 값만큼
 * bottom 을 띄운다. Tailwind 클래스가 아니라 JS 상수인 이유: 동적으로 만든
 * `bottom-[${...}]` 같은 클래스명은 Tailwind 가 정적으로 스캔하지 못해 빌드에서
 * 빠질 수 있다 — 그래서 inline style 로만 쓴다.
 */
export const BOTTOM_MENU_HEIGHT = 'calc(3.75rem + env(safe-area-inset-bottom))';

/** Figma "NAV" 컴포넌트 셋(지도/마이페이지/그룹 variant) 기준 하단 탭바. */
export interface BottomMenuItem {
  /** 아직 연결된 라우트가 없으면 생략한다 — 탭은 보이되 클릭은 동작하지 않는다. */
  to?: string;
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
  hidden?: boolean;
  className?: string;
}

function BottomMenu({ items, hidden = false, className }: BottomMenuProps) {
  return (
    <nav
      aria-hidden={hidden}
      className={cn(
        // 시안(NAV)은 60px 탭 행 + 24px 좌우 여백에 60px 항목을 justify-between 으로 편다.
        // 그 아래 20px 은 iOS 홈 인디케이터 영역이라 safe-area 로 대신한다.
        'fixed inset-x-0 bottom-0 z-[60] flex justify-between border-t border-gray-10 bg-gray-0 px-6 pb-[env(safe-area-inset-bottom)]',
        'transition-[transform,opacity] duration-200 ease-out will-change-transform',
        hidden ? 'pointer-events-none translate-y-full opacity-0' : 'translate-y-0 opacity-100',
        className,
      )}
    >
      {items.map((item) =>
        item.to ? (
          <NavLink
            key={item.label}
            to={item.to}
            end={item.end}
            className="flex h-15 w-15 flex-col items-center justify-center gap-1"
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
        ) : (
          // 아직 라우트가 없는 탭 — 보이기만 하고 클릭은 동작하지 않는다.
          <span
            key={item.label}
            aria-disabled="true"
            className="flex h-15 w-15 flex-col items-center justify-center gap-1"
          >
            <span className="flex h-8 w-8 items-center justify-center text-gray-50">
              {item.icon}
            </span>
            <span className="font-mono text-e2 text-gray-50">{item.label}</span>
          </span>
        ),
      )}
    </nav>
  );
}

export { BottomMenu };
