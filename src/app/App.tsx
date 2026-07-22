import { RouterProvider } from 'react-router-dom';
import { AppProviders } from '@/app/providers';
import { router } from '@/app/router';

/**
 * 모바일 뷰 셸. 375px(디자인 시안 기준) 을 상한으로 잡고, 그보다 좁은 실제
 * 모바일 기기에서는 w-full 이 그대로 이겨서 기기 너비를 꽉 채운다.
 * 데스크톱 브라우저에서는 375px 폭으로 가운데 정렬되어 모바일 뷰처럼 보인다.
 */
export function App() {
  return (
    <AppProviders>
      <div className="mx-auto min-h-dvh w-full max-w-[375px] bg-gray-0">
        <RouterProvider router={router} />
      </div>
    </AppProviders>
  );
}
