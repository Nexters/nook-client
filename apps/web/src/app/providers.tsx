import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { createContext, useContext, useState } from 'react';
import { NavermapsProvider } from 'react-naver-maps';
import { queryClient } from '@/app/queryClient';
import { env } from '@/shared/config/env';
import { ToastProvider } from '@/shared/toast';

// 렌더마다 새 배열을 만들면 provider 가 로드 옵션이 바뀐 것으로 볼 수 있어 모듈 상수로 둔다.
const NAVER_MAP_SUBMODULES = ['gl'];

/**
 * 앱 셸(아래 AppProviders 의 375~450px 모바일 뷰 래퍼) DOM 엘리먼트.
 *
 * Drawer(vaul) 처럼 `position: fixed` + Portal 을 쓰는 컴포넌트는 기본적으로
 * `document.body` 에 포탈되어 뷰포트 전체 기준으로 위치가 잡힌다. 데스크톱처럼
 * 뷰포트가 셸보다 넓을 때도 셸 폭 안에 붙어있게 하려면, 이 컨테이너를 해당
 * 컴포넌트의 `container` prop 으로 넘겨 셸 안으로 포탈시켜야 한다.
 */
const AppShellContainerContext = createContext<HTMLElement | null>(null);

export function useAppShellContainer() {
  return useContext(AppShellContainerContext);
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [shellEl, setShellEl] = useState<HTMLDivElement | null>(null);
  return (
    <AppShellContainerContext.Provider value={shellEl}>
      <div
        ref={setShellEl}
        // overflow-hidden 이 아니라 clip 이다 — hidden 은 스크롤 컨테이너를 만들어서, 그 안의
        // position:sticky 가 #root 가 아니라 이 셸(스크롤되지 않는다)을 기준으로 삼아 영영 붙지
        // 않는다(아카이브 상세의 게시물/장소 탭). clip 은 스크롤 컨테이너가 아니면서 같은 만큼
        // 잘라내, 슬라이드 화면이 셸 밖으로 새지 않게 하는 원래 목적은 그대로 지킨다.
        className="mx-auto min-h-dvh w-full overflow-clip bg-gray-0 will-change-transform max-w-[450px]"
      >
        <QueryClientProvider client={queryClient}>
          {/* gl: 벡터맵 서브모듈. Style Editor 커스텀 스타일(customStyleId)은 GL 에서만 적용된다. */}
          <NavermapsProvider ncpKeyId={env.naverMapClientId} submodules={NAVER_MAP_SUBMODULES}>
            <ToastProvider>{children}</ToastProvider>
          </NavermapsProvider>
        </QueryClientProvider>
      </div>
    </AppShellContainerContext.Provider>
  );
}
