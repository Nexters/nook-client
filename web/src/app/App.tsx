import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { AppProviders } from '@/app/providers';
import { router } from '@/app/router';
import { nativeBridge } from '@/native-bridge';

export function App() {
  // 셸 핸드셰이크(WEB_READY). 네이티브는 이 시점에 대기 중인 공유를 전달한다.
  useEffect(() => {
    nativeBridge.start();
  }, []);

  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
