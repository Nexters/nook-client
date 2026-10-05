import { useNavigate } from 'react-router-dom';
import emptyIllustration from '@/assets/images/200_empty.svg';
import { INSTAGRAM_URL } from '@/features/onboarding/OnboardingPage';
import { nativeBridge } from '@/native-bridge';
import { env } from '@/shared/config/env';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';

/**
 * 한 번도 저장하지 않은 사람의 빈 상태(NOOK-393, Figma 362:16492) — 지도 `최근 저장한 공간`과
 * 기본 아카이브 상세가 같은 화면을 쓴다. 위치·높이는 놓이는 곳마다 달라 className 으로 받는다.
 *
 * `저장하러 가기` 는 온보딩 3장 CTA 와 같은 인스타그램 게시물로, 안내 링크는 온보딩 다시보기로 보낸다.
 */
export function FirstSaveEmpty({ className }: { className?: string }) {
  const navigate = useNavigate();
  // `/onboarding` 진입 조건(`RequireOnboarding`)과 같다 — 열 수 없는 곳에서는 링크도 없다.
  const canOpenOnboarding = nativeBridge.isNative || env.enableDevRoutes;

  return (
    <div className={cn('flex flex-col items-center justify-between', className)}>
      <div className="flex flex-col items-center gap-3">
        <img src={emptyIllustration} alt="" className="size-[180px]" />
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="flex flex-col items-center gap-1">
            <p className="text-b1 font-semibold text-gray-80">첫 게시물을 저장해보세요</p>
            <p className="text-b3 font-medium text-gray-60">
              인스타그램 게시물 공유로 장소를 저장할 수 있어요
            </p>
          </div>
          <Button
            size="sm"
            className="bg-gray-80 text-b3 hover:bg-gray-90 active:bg-gray-90"
            onClick={() => nativeBridge.openExternalUrl(INSTAGRAM_URL)}
          >
            저장하러 가기
          </Button>
        </div>
      </div>
      {canOpenOnboarding ? (
        <button
          type="button"
          onClick={() => navigate('/onboarding?replay=1')}
          className="text-b3 font-semibold text-gray-60 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100"
        >
          NOOK에 어떻게 저장하나요?
        </button>
      ) : null}
    </div>
  );
}
