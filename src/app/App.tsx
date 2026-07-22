import { RouterProvider } from 'react-router-dom';
import { AppProviders } from '@/app/providers';
import { router } from '@/app/router';
import { platform } from '@/shared/native/platform';

/**
 * 모바일 뷰 셸. 375px(디자인 시안 기준) 상한은 데스크톱 브라우저에서 모바일
 * 화면처럼 프리뷰하기 위한 것일 뿐이라, 네이티브(Capacitor) 앱에서는 적용하지
 * 않는다 — 실제 기기 너비는 375px보다 넓은 경우가 흔해서(390~420px대), 상한을
 * 그대로 걸면 실기기에서 오히려 양옆에 불필요한 여백이 생긴다.
 */
export function App() {
  return (
    <AppProviders>
      <div
        className={`mx-auto min-h-dvh w-full bg-gray-0 ${platform.isNative ? '' : 'max-w-[375px]'}`}
      >
        <RouterProvider router={router} />
      </div>
    </AppProviders>
  );
}
