import { createBrowserRouter } from 'react-router-dom';
import { HomePage } from '@/features/home/HomePage';
import { MapPage } from '@/features/map/MapPage';

/**
 * 앱 라우터. 번들 Capacitor 웹이라 SSR 프레임워크 모드는 쓰지 않는다(SPA).
 *
 * NOTE: 네이티브(Capacitor)에서 딥링크/새로고침 시 BrowserRouter 경로 문제가
 * 확인되면 createHashRouter 로 폴백한다. (파운데이션 단계라 전환 비용 낮음)
 */
/**
 * 개발 전용 라우트. `import.meta.env.DEV` 가 false 인 prod 빌드에서는 이 분기 전체가
 * 정적으로 제거되어, `@/dev/UiComponentsPage` 청크가 prod 번들에 포함되지 않는다.
 *
 * splat(`/dev/ui/*`)로 두어 UI 페이지의 BottomMenu 탭이 `/dev/ui/...` 하위 경로로만
 * 이동하며 같은 페이지를 유지한다(앱 라우터 밖으로 나가지 않음).
 */
const devRoutes = import.meta.env.DEV
  ? [
      {
        path: '/dev/ui/*',
        lazy: async () => {
          const { UiComponentsPage } = await import('@/dev/UiComponentsPage');
          return { Component: UiComponentsPage };
        },
      },
    ]
  : [];

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/map',
    element: <MapPage />,
  },
  ...devRoutes,
]);
