import { createBrowserRouter } from 'react-router-dom';
import { HomePage } from '@/features/home/HomePage';

// 셸 WebView 에서 딥링크/새로고침 시 BrowserRouter 경로 문제가 확인되면
// createHashRouter 로 폴백한다.

// import.meta.env.DEV 가 false 인 prod 빌드에서는 이 분기 전체가 정적으로 제거되어
// UiComponentsPage 청크가 prod 번들에 포함되지 않는다.
// splat(`/dev/ui/*`)이라 UI 페이지의 탭 이동이 같은 페이지를 유지한다.
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
  ...devRoutes,
]);
