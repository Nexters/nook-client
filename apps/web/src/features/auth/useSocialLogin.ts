import type { SocialProvider } from '@nook/bridge-contracts';
import { useCallback, useState } from 'react';
import { useAuthSession } from '@/features/auth/session/AuthSessionProvider';
import { nativeBridge } from '@/native-bridge';
import { authenticateSocial, SocialAuthRequestProvider, unwrapApiResponse } from '@/shared/api';

const API_PROVIDER: Record<SocialProvider, SocialAuthRequestProvider> = {
  apple: SocialAuthRequestProvider.APPLE,
  kakao: SocialAuthRequestProvider.KAKAO,
};

const GENERIC_ERROR = '로그인하지 못했어요. 잠시 후 다시 시도해 주세요.';

/**
 * 셸이 provider SDK 로 받아온 자격증명을 백엔드에 넘겨 서비스 세션을 만든다.
 * 세션 저장 후 라우트 가드가 알아서 진입 화면으로 보낸다.
 */
export function useSocialLogin() {
  const { establish } = useAuthSession();
  const [pendingProvider, setPendingProvider] = useState<SocialProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const signIn = useCallback(
    async (provider: SocialProvider) => {
      // 브라우저에는 셸이 없어 provider SDK 를 띄울 수 없다.
      if (!nativeBridge.isNative) {
        setError('앱에서만 로그인할 수 있어요.');
        return;
      }

      setError(null);
      setPendingProvider(provider);
      try {
        const result = await nativeBridge.requestSocialLogin(provider);
        // 사용자가 직접 닫은 경우라 오류로 알리지 않는다.
        if (result.status === 'cancelled') return;
        if (result.status !== 'success' || !result.credential) {
          setError(GENERIC_ERROR);
          return;
        }

        const auth = unwrapApiResponse(
          await authenticateSocial({ provider: API_PROVIDER[provider], ...result.credential }),
        );

        if (!auth?.accessToken) {
          setError(GENERIC_ERROR);
          return;
        }

        await establish(auth.accessToken, auth.refreshToken ?? null);
      } catch {
        setError(GENERIC_ERROR);
      } finally {
        setPendingProvider(null);
      }
    },
    [establish],
  );

  return { signIn, pendingProvider, error } as const;
}
