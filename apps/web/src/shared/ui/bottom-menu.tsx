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

/**
 * 화면 하단이 무엇에 가려져 있는지 — 탭바가 보이면 그 높이, 아니면 safe-area 만.
 * `ProtectedAppLayout` 이 탭바 표시 상태에 맞춰 :root 에 심고, 하단에 떠 있는 요소
 * (토스트)가 이 값만큼 비켜 앉는다. 탭바가 없는 라우트(로그인·약관)에서는 값이 없어
 * 사용처의 fallback(safe-area)이 쓰인다.
 *
 * 레이어(z-index) 순서: 콘텐츠 10 → 화면 크롬(헤더·FAB) 40 → 시트/드롭다운 50 →
 * 탭바 60 → 모달·전체화면 뷰어 70 → 토스트 100.
 */
export const BOTTOM_INSET_VAR = '--bottom-menu-inset';

/**
 * 탭바 대신 화면이 직접 하단에 깔아둔 바(예: 아카이브 상세의 선택 삭제 CTA)의 높이.
 * 그 화면이 켜고 끄며, 토스트는 둘 중 큰 값만큼 비켜 앉는다 — 소유자가 달라
 * 변수를 나눠야 서로 덮어쓰지 않는다.
 */
export const BOTTOM_BAR_INSET_VAR = '--bottom-bar-inset';

/** Figma "NAV" 컴포넌트 셋(지도/마이페이지/아카이브 variant) 기준 하단 탭바. */
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
        // 배경·구분선은 화면 폭을 꽉 채우고, 탭 행만 시안 폭(375)으로 묶는다.
        // 그 아래 20px 은 iOS 홈 인디케이터 영역이라 safe-area 로 대신한다.
        'fixed inset-x-0 bottom-0 z-[60] border-t border-gray-10 bg-gray-0 pb-[env(safe-area-inset-bottom)]',
        'transition-[transform,opacity] duration-200 ease-out will-change-transform',
        hidden ? 'pointer-events-none translate-y-full opacity-0' : 'translate-y-0 opacity-100',
        className,
      )}
    >
      {/*
        시안 `nav` 실측: 375x60 행에 60x60 항목이 x=24 / 157.5 / 291.
        = 좌우 24px 여백 + justify-between. 화면이 시안보다 넓어도 항목이 양끝으로
        벌어지지 않도록 행 자체를 375 로 묶고 가운데 정렬한다.
      */}
      <div className="mx-auto flex w-full max-w-[375px] items-center justify-between px-6">
        {items.map((item) =>
          item.to ? (
            <NavLink
              key={item.label}
              to={item.to}
              end={item.end}
              className="flex h-15 w-15 flex-col items-center justify-center"
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
              className="flex h-15 w-15 flex-col items-center justify-center"
            >
              <span className="flex h-8 w-8 items-center justify-center text-gray-50">
                {item.icon}
              </span>
              <span className="font-mono text-e2 text-gray-50">{item.label}</span>
            </span>
          ),
        )}
      </div>
    </nav>
  );
}

export { BottomMenu };
