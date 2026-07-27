import { useNavigate } from 'react-router-dom';
import nookLogo from '@/assets/logo/Vector.svg';
import { OnboardingCarousel } from '@/features/auth/components/OnboardingCarousel';
import {
  AppleIcon,
  KakaoIcon,
  SocialLoginButton,
} from '@/features/auth/components/SocialLoginButton';
// @coldbrow Temporary deactivation for UT
// import { requestSocialLogin } from '@/features/auth/social-login';

export function LoginPage() {
  const navigate = useNavigate();

  return (
    <main
      className="mx-auto grid h-dvh w-full max-w-[375px] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-gray-0 px-4"
      style={{
        paddingTop: 'calc(1rem + env(safe-area-inset-top))',
        paddingBottom: 'calc(0.125rem + env(safe-area-inset-bottom))',
      }}
    >
      <header>
        <img src={nookLogo} alt="nook" className="h-[22px] w-[50px]" />
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

      <div className="flex flex-col gap-2 pb-3">
        <SocialLoginButton
          provider="kakao"
          icon={<KakaoIcon />}
          label="카카오로 시작하기"
          onClick={() => navigate('/map')}
          // onClick={() => requestSocialLogin('kakao')}
        />
        <SocialLoginButton
          provider="apple"
          icon={<AppleIcon />}
          label="Apple로 시작하기"
          onClick={() => navigate('/map')}
          // onClick={() => requestSocialLogin('apple')}
        />
      </div>
    </main>
  );
}
