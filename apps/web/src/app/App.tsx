import { RouterProvider } from 'react-router-dom';
import { AppProviders } from '@/app/providers';
import { router } from '@/app/router';
import { AuthSessionProvider } from '@/features/auth/session/AuthSessionProvider';
import { nativeBridge } from '@/native-bridge';

export function App() {
  // 자식 AuthSessionProvider의 effect가 SESSION_GET을 보내기 전에 수신 함수를 설치한다.
  nativeBridge.start();

  return (
    <AppProviders>
      <AuthSessionProvider>
        <RouterProvider router={router} />
      </AuthSessionProvider>
    </AppProviders>
  );
}
