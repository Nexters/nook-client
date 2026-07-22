import { createBrowserRouter } from 'react-router-dom';
import { HomePage } from '@/features/home/HomePage';
import { MapPage } from '@/features/map/MapPage';

/**
 * 앱 라우터. 번들 Capacitor 웹이라 SSR 프레임워크 모드는 쓰지 않는다(SPA).
 *
 * NOTE: 네이티브(Capacitor)에서 딥링크/새로고침 시 BrowserRouter 경로 문제가
 * 확인되면 createHashRouter 로 폴백한다. (파운데이션 단계라 전환 비용 낮음)
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/map',
    element: <MapPage />,
  },
]);
