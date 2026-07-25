import { createBrowserRouter } from 'react-router-dom';
import { HomePage } from '@/features/home/HomePage';

// 셸 WebView 에서 딥링크/새로고침 시 BrowserRouter 경로 문제가 확인되면
// createHashRouter 로 폴백한다.
export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
]);
