import { createBrowserRouter } from 'react-router-dom';
import { ProtectedAppLayout } from '@/app/layouts/ProtectedAppLayout';
import { NativeBackHost } from '@/app/native-back';
import { RootScrollReset } from '@/app/scroll-reset';
import { ArchiveDetailPage } from '@/features/archive/ArchiveDetailPage';
import { ArchiveFormPage } from '@/features/archive/ArchiveFormPage';
import { ArchivePage } from '@/features/archive/ArchivePage';
import { LoginPage } from '@/features/auth/LoginPage';
import {
  AuthEntryRedirect,
  AwaitSession,
  RedirectAuthenticated,
} from '@/features/auth/session/AuthRouteGuards';
import { MapPage } from '@/features/map/MapPage';
import { PlacePostsPage } from '@/features/map/PlacePostsPage';
import { ContactPage } from '@/features/my/ContactPage';
import { MyPage } from '@/features/my/MyPage';
import { PrivacyPolicyPage } from '@/features/my/policy/PrivacyPolicyPage';
import { TermsPage } from '@/features/my/policy/TermsPage';
import { PostDetailPage } from '@/features/post/PostDetailPage';
import { SharedArchivePage } from '@/features/share/SharedArchivePage';
import { SharedPostDetailPage } from '@/features/share/SharedPostDetailPage';
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
    element: (
      <>
        <RootScrollReset />
        <NativeBackHost />
      </>
    ),
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
          <AwaitSession>
            <ProtectedAppLayout />
          </AwaitSession>
        ),
        children: [
          {
            path: 'map',
            element: <MapPage />,
          },
          {
            path: 'archive',
            element: <ArchivePage />,
          },
          {
            path: 'archive/new',
            element: <ArchiveFormPage mode="create" />,
          },
          {
            path: 'archive/:archiveId',
            element: <ArchiveDetailPage />,
          },
          {
            path: 'archive/:archiveId/edit',
            element: <ArchiveFormPage mode="edit" />,
          },
          {
            path: 'post/:postId',
            element: <PostDetailPage />,
          },
          {
            path: 'place/:placeId/posts',
            element: <PlacePostsPage />,
          },
          {
            path: 'my',
            element: <MyPage />,
          },
        ],
      },
      // 공유 아카이브 열람 — 링크만 있으면 비로그인도 본다.
      // AwaitSession 은 리다이렉트하지 않고 부트스트래핑 동안만 렌더를 미룬다 —
      // 게스트는 그대로 보되, 네이티브 콜드 스타트에서 세션 복구 전 인증된 것처럼
      // 취급되는 경합만 막는다.
      {
        path: 'shared/:token',
        element: (
          <AwaitSession>
            <SharedArchivePage />
          </AwaitSession>
        ),
      },
      {
        path: 'shared/:token/post/:postId',
        element: (
          <AwaitSession>
            <SharedPostDetailPage />
          </AwaitSession>
        ),
      },
      // 스토어 심사·앱 스토어 등록에 공개 URL 이 필요해 로그인 밖에 둔다.
      {
        path: 'privacy',
        element: <PrivacyPolicyPage />,
      },
      {
        path: 'terms',
        element: <TermsPage />,
      },
      {
        path: 'support',
        element: <ContactPage />,
      },
    ],
  },
  ...devRoutes,
]);
