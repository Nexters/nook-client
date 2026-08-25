import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ONBOARDING_SLIDE_COUNT,
  OnboardingCarousel,
} from '@/features/auth/components/OnboardingCarousel';
import {
  AppleIcon,
  KakaoIcon,
  SocialLoginButton,
} from '@/features/auth/components/SocialLoginButton';
import { useSocialLogin } from '@/features/auth/useSocialLogin';
import { nativeBridge } from '@/native-bridge';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';

const policyLinkClass =
  'rounded-sm underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100';

export function LoginPage() {
  const { signIn, pendingProvider, error } = useSocialLogin();
  // Apple 로그인은 iOS 셸에서만 동작한다 (expo-apple-authentication 이 iOS 전용).
  const showAppleLogin = nativeBridge.platform === 'ios';
  const [slideIndex, setSlideIndex] = useState(0);
  const isLastSlide = slideIndex === ONBOARDING_SLIDE_COUNT - 1;

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
      {/* 로그인하지 않고 앱을 둘러보는 출구. 계정이 필요한 동작에서만 로그인 월이 뜨므로
          여기서 나가도 지도·아카이브는 그대로 볼 수 있다. */}
      <div className="flex justify-end px-4 pt-2">
        <Link
          to="/map"
          replace
          className="rounded-sm px-1 py-1 text-b2 text-gray-50 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100"
        >
          둘러보기
        </Link>
      </div>

      <OnboardingCarousel activeIndex={slideIndex} onActiveIndexChange={setSlideIndex} />

      {/* 마지막 장에서만 로그인 버튼을 연다 — 앞 장에서는 `다음` 뿐이라 온보딩을 지나칠 수 없다.
          두 블록을 같은 그리드 칸에 겹쳐 두는 이유는 높이다. 로그인 묶음이 `다음` 하나보다
          높아서, 따로 두면 마지막 장에서 캐러셀이 줄며 일러스트와 문구가 위로 튄다.
          겹쳐 두면 칸 높이가 늘 로그인 묶음 높이(둘 중 큰 쪽)라, 이 화면이 세로로 요구하는
          공간은 온보딩 도입 전과 같다 — 짧은 기기에서 새로 넘칠 여지가 없다. */}
      <div className="grid px-4 pt-8">
        <div
          className={cn('col-start-1 row-start-1 flex flex-col gap-2', !isLastSlide && 'invisible')}
          // inert 가 브라우저에서는 포커스와 접근성 트리를 함께 막지만, jsdom 은 이를
          // 반영하지 않아 테스트에서 숨긴 버튼이 그대로 잡힌다 — aria-hidden 을 같이 건다.
          inert={!isLastSlide || undefined}
          aria-hidden={!isLastSlide || undefined}
        >
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

        {isLastSlide ? null : (
          <Button
            size="lg"
            fullWidth
            className="col-start-1 row-start-1 self-start"
            onClick={() => setSlideIndex(slideIndex + 1)}
          >
            다음
          </Button>
        )}
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
