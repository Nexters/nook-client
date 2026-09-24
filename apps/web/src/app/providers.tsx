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
 * 전체화면 오버레이(vaul Drawer 등)를 포탈할 자리.
 *
 * Drawer 처럼 `position: fixed` + Portal 을 쓰는 컴포넌트는 기본적으로 `document.body` 에
 * 포탈되어 뷰포트 전체 기준으로 위치가 잡힌다. 데스크톱처럼 뷰포트가 셸보다 넓을 때도
 * 셸 폭 안에 붙어있게 하려면 이 컨테이너를 `container` prop 으로 넘겨야 한다.
 *
 * 셸 자체를 넘기면 안 된다. vaul 은 이 컨테이너를 **재서** 스냅 높이를 계산하는데,
 * 셸은 `min-h-dvh` 라 콘텐츠만큼 늘어난다 — 긴 목록(아카이브 장소 탭 등)에서 지도로
 * 넘어오면 시트가 뷰포트가 아니라 그 페이지 높이를 기준으로 스냅을 잡아 화면 아래로
 * 주차된다(장소 상세가 안 올라옴). 그래서 높이가 항상 뷰포트인 빈 호스트를 따로 둔다.
 */
const AppOverlayContainerContext = createContext<HTMLElement | null>(null);

export function useAppOverlayContainer() {
  return useContext(AppOverlayContainerContext);
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [overlayEl, setOverlayEl] = useState<HTMLDivElement | null>(null);
  return (
    <AppOverlayContainerContext.Provider value={overlayEl}>
      <div
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

        {/* 오버레이 포탈 자리. 폭은 셸을 따르고 높이는 늘 뷰포트(h-dvh)다 — 셸은 콘텐츠만큼
            길어지므로 여기 기대면 안 된다(위 컨텍스트 주석). 스스로는 아무것도 받지 않고
            (pointer-events-none) 안에 들어오는 오버레이만 되살린다. */}
        <div
          ref={setOverlayEl}
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-dvh"
        />
      </div>
    </AppOverlayContainerContext.Provider>
  );
}
