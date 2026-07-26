import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { AppProviders } from '@/app/providers';
import { router } from '@/app/router';
import { nativeBridge } from '@/native-bridge';
import { AppShellContainerContext } from '@/shared/lib/app-shell-container';

/**
 * 모바일 뷰 셸. 450px(디자인 시안 기준) 상한은 데스크톱 브라우저에서 모바일
 * 화면처럼 프리뷰하기 위한 것일 뿐이라, 네이티브 셸(Expo WebView) 안에서는
 * 적용하지 않는다 — 실제 기기 너비는 375px보다 넓은 경우가 흔해서(390~420px대),
 * 상한을 그대로 걸면 실기기에서 오히려 양옆에 불필요한 여백이 생긴다.
 *
 * `will-change-transform` 은 성능 힌트가 아니라, `position: fixed` 요소(Drawer,
 * BottomMenu 등)의 기준점을 뷰포트가 아니라 이 셸로 바꾸기 위한 트릭이다. transform
 * 계열 속성이 하나라도 걸린 조상은 fixed 자손의 containing block 이 되므로, 데스크톱
 * 처럼 뷰포트가 450px 보다 넓어도 fixed 요소가 브라우저 창 전체로 퍼지지 않고 이
 * 셸(가운데 정렬된 450px 폭) 안에 그대로 붙는다.
 */
export function App() {
  const [shellEl, setShellEl] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    nativeBridge.start();
  }, []);

  return (
    <AppProviders>
      <AppShellContainerContext.Provider value={shellEl}>
        <div
          ref={setShellEl}
          className={`mx-auto min-h-dvh w-full bg-gray-0 will-change-transform ${nativeBridge.isNative ? '' : 'max-w-[450px]'}`}
        >
          <RouterProvider router={router} />
        </div>
      </AppShellContainerContext.Provider>
    </AppProviders>
  );
}
