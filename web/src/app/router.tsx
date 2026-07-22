import { createBrowserRouter } from 'react-router-dom';
import { HomePage } from '@/features/home/HomePage';

/**
 * 앱 라우터(SPA). 원격 웹(app.nook.com)이 WebView/브라우저에서 뜨는 실 https origin 이라
 * BrowserRouter 사용에 문제 없다(호스팅에서 SPA fallback 설정 필요).
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
]);
