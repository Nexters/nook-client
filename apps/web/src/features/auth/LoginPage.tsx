import { OnboardingCarousel } from '@/features/auth/components/OnboardingCarousel';
import {
  AppleIcon,
  KakaoIcon,
  SocialLoginButton,
} from '@/features/auth/components/SocialLoginButton';
import { useSocialLogin } from '@/features/auth/useSocialLogin';
import { nativeBridge } from '@/native-bridge';

export function LoginPage() {
  const { signIn, pendingProvider, error } = useSocialLogin();
  // Apple 로그인은 iOS 셸에서만 동작한다 (expo-apple-authentication 이 iOS 전용).
  const showAppleLogin = nativeBridge.platform === 'ios';

  return (
    <main
      // 일러스트가 시안처럼 가로를 꽉 채워야 해서 좌우 여백은 버튼 영역만 갖는다.
      className="mx-auto flex h-dvh w-full max-w-[375px] flex-col overflow-hidden bg-gray-0"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        // 시안 기준 버튼 아래 여백은 42pt(홈 인디케이터 34 + 8). 홈 버튼 기기처럼
        // safe-area 가 0 인 경우 너무 붙어서 최소값을 둔다.
        paddingBottom: 'max(1rem, calc(0.5rem + env(safe-area-inset-bottom)))',
      }}
    >
      <OnboardingCarousel />

      <div className="flex flex-col gap-2 px-4 pt-8">
        <SocialLoginButton
          provider="kakao"
          icon={<KakaoIcon />}
          label="카카오로 로그인"
          disabled={pendingProvider !== null}
          onClick={() => void signIn('kakao')}
        />
        {showAppleLogin ? (
          <SocialLoginButton
            provider="apple"
            icon={<AppleIcon />}
            label="Apple로 로그인"
            disabled={pendingProvider !== null}
            onClick={() => void signIn('apple')}
          />
        ) : null}
        {error ? (
          <p role="alert" className="mt-1 text-center text-b3 text-error">
            {error}
          </p>
        ) : null}
      </div>
    </main>
  );
}
