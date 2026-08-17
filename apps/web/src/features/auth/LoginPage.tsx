import { Link } from 'react-router-dom';
import { OnboardingCarousel } from '@/features/auth/components/OnboardingCarousel';
import {
  AppleIcon,
  KakaoIcon,
  SocialLoginButton,
} from '@/features/auth/components/SocialLoginButton';
import { useSocialLogin } from '@/features/auth/useSocialLogin';
import { nativeBridge } from '@/native-bridge';

const policyLinkClass =
  'rounded-sm underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100';

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
        // 시안 기준 맨 아래 문구 아래 여백은 42pt(홈 인디케이터 34 + 8). 홈 버튼 기기처럼
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

      {/* 로그인 자체가 약관 동의라, 동의 사실과 문서 링크를 버튼 바로 아래에서 함께 알린다.
          약관·개인정보처리방침은 로그인 밖 공개 라우트라(router.tsx) 로그인 전에도 열리고,
          뒤로가기로 이 화면으로 돌아온다(PolicyPage 의 navigate(-1)).
          줄바꿈이 명시적인 이유: 문구 전체가 한 줄에 들어가서(375pt 중 270pt) 자연
          줄바꿈으로는 시안의 두 줄이 나오지 않는다. 좁은 화면에서도 첫 줄은 192pt 라 안전하다.
          br 앞의 공백은 낭독·복사 시 "…방침에동의하게" 로 붙지 않게 두는 것이고,
          줄 끝 공백이라 가운데 정렬에는 영향이 없다. */}
      <p className="px-4 pt-3 text-center text-b3 text-gray-50">
        계속하면{' '}
        <Link to="/terms" className={policyLinkClass}>
          이용약관
        </Link>
        과{' '}
        <Link to="/privacy" className={policyLinkClass}>
          개인정보처리방침
        </Link>
        에 <br />
        동의하게 됩니다.
      </p>
    </main>
  );
}
