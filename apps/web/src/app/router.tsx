import { createBrowserRouter } from 'react-router-dom';
import { ProtectedAppLayout } from '@/app/layouts/ProtectedAppLayout';
import { NativeBackHost } from '@/app/native-back';
import { LoginPage } from '@/features/auth/LoginPage';
import {
  AuthEntryRedirect,
  RedirectAuthenticated,
  RequireAuth,
} from '@/features/auth/session/AuthRouteGuards';
import { GroupDetailPage } from '@/features/group/GroupDetailPage';
import { GroupFormPage } from '@/features/group/GroupFormPage';
import { GroupPage } from '@/features/group/GroupPage';
import { MapPage } from '@/features/map/MapPage';
import { MyPage } from '@/features/my/MyPage';
import { PrivacyPolicyPage } from '@/features/my/policy/PrivacyPolicyPage';
import { TermsPage } from '@/features/my/policy/TermsPage';
import { PostDetailPage } from '@/features/post/PostDetailPage';
import { env } from '@/shared/config/env';

// 셸 WebView 에서 딥링크/새로고침 시 BrowserRouter 경로 문제가 확인되면
// createHashRouter 로 폴백한다.

// 로컬 개발 환경 또는 VITE_ENABLE_DEV_ROUTES=true 인 배포에서만 등록한다.
// splat(`/dev/ui/*`)이라 UI 페이지의 탭 이동이 같은 페이지를 유지한다.
const devRoutes = env.enableDevRoutes
  ? [
      {
        path: '/dev/ut',
        lazy: async () => {
          const { DevSessionPage } = await import('@/dev/DevSessionPage');
          return { Component: DevSessionPage };
        },
      },
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
    element: <NativeBackHost />,
    children: [
      {
        index: true,
        element: <AuthEntryRedirect />,
      },
      {
        path: 'login',
        element: (
          <RedirectAuthenticated>
            <LoginPage />
          </RedirectAuthenticated>
        ),
      },
      {
        element: (
          <RequireAuth>
            <ProtectedAppLayout />
          </RequireAuth>
        ),
        children: [
          {
            path: 'map',
            element: <MapPage />,
          },
          {
            path: 'group',
            element: <GroupPage />,
          },
          {
            path: 'group/new',
            element: <GroupFormPage mode="create" />,
          },
          {
            path: 'group/:groupId',
            element: <GroupDetailPage />,
          },
          {
            path: 'group/:groupId/edit',
            element: <GroupFormPage mode="edit" />,
          },
          {
            path: 'post/:postId',
            element: <PostDetailPage />,
          },
          {
            path: 'my',
            element: <MyPage />,
          },
          {
            path: 'my/privacy',
            element: <PrivacyPolicyPage />,
          },
          {
            path: 'my/terms',
            element: <TermsPage />,
          },
        ],
      },
    ],
  },
  ...devRoutes,
]);
