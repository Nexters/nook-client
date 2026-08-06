import { useNavigate } from 'react-router-dom';
import headerLogo from '@/assets/logo/header_logo.svg';
import { OnboardingCarousel } from '@/features/auth/components/OnboardingCarousel';
import {
  AppleIcon,
  KakaoIcon,
  SocialLoginButton,
} from '@/features/auth/components/SocialLoginButton';
import { useSocialLogin } from '@/features/auth/useSocialLogin';
import { nativeBridge } from '@/native-bridge';
import { env } from '@/shared/config/env';

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn, pendingProvider, error } = useSocialLogin();
  // Apple 로그인은 iOS 셸에서만 동작한다 (expo-apple-authentication 이 iOS 전용).
  const showAppleLogin = nativeBridge.platform === 'ios';

  return (
    <main
      className="mx-auto grid h-dvh w-full max-w-[375px] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-gray-0 px-4"
      style={{
        paddingTop: 'calc(1rem + env(safe-area-inset-top))',
        paddingBottom: 'calc(0.125rem + env(safe-area-inset-bottom))',
      }}
    >
      <header>
        <img src={headerLogo} alt="nook" className="h-8 w-[84px]" />
      </header>

      <div
        className="flex min-h-0 items-start justify-center pt-[clamp(20px,5.3dvh,43px)]"
        style={{ containerType: 'size' }}
      >
        <div
          className="aspect-[343/480] max-w-[343px]"
          style={{ width: 'min(100cqw, calc(71.4583cqh - 8px), 343px)' }}
        >
          <OnboardingCarousel />
        </div>
      </div>

      <div className="flex flex-col gap-2 pb-3 pt-4">
        <SocialLoginButton
          provider="kakao"
          icon={<KakaoIcon />}
          label="카카오로 시작하기"
          disabled={pendingProvider !== null}
          onClick={() => void signIn('kakao')}
        />
        {showAppleLogin ? (
          <SocialLoginButton
            provider="apple"
            icon={<AppleIcon />}
            label="Apple로 시작하기"
            disabled={pendingProvider !== null}
            onClick={() => void signIn('apple')}
          />
        ) : null}
        {error ? (
          <p role="alert" className="mt-1 text-center text-b3 text-error">
            {error}
          </p>
        ) : null}
        {env.enableDevRoutes ? (
          <button
            type="button"
            className="mt-1 h-9 text-b3 font-semibold text-gray-60 underline underline-offset-4"
            onClick={() => navigate('/dev/ut')}
          >
            테스트 토큰으로 로그인
          </button>
        ) : null}
      </div>
    </main>
  );
}
