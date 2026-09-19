import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { markOnboardingSeen } from '@/features/onboarding/onboardingSeen';
import { shareViaSystem } from '@/features/share/lib/shareUrl';
import { nativeBridge } from '@/native-bridge';
import { env } from '@/shared/config/env';
import { Icon24Close } from '@/shared/icons/NookIcons';
import { cn } from '@/shared/lib/utils';
import { Button, CarouselIndicator, Lottie } from '@/shared/ui';

/** 2장이 여는 공유 시트의 대상. 무엇을 공유하든 상관없다 — 시트를 띄우는 것 자체가 목적이다. */
const SHARE_TARGET = { title: 'nook', url: env.webOrigin };

/**
 * 3장이 보내는 누크 공식 계정. https 주소 그대로 연다 — 인스타그램이 이 도메인을 앱 링크로
 * 등록해 둬서, 앱이 깔려 있으면 앱으로, 없으면 브라우저로 열린다(`nativeBridge.openExternalUrl`).
 * `instagram://` 스킴을 쓰지 않는 이유: iOS 는 설치 확인에 Info.plist 등록과 셸 재빌드가 필요하고,
 * 스킴 주소에는 `stkn` 을 실을 수 없다.
 */
const INSTAGRAM_URL = 'https://www.instagram.com/nook.archiving?stkn=NTl6bTd6MW9kOXBu';

/**
 * 가운데 그림. 디자이너가 HTML 로만 준 장은 iframe 으로, Lottie JSON 이 있는 장은 그걸로 재생한다.
 * JSON 쪽이 가볍다 — 3장의 HTML 은 lottie-web 런타임에 같은 JSON 을 박아 넣은 미리보기일 뿐인데,
 * 런타임은 이미 번들에 있다(`@/shared/ui/lottie`).
 */
type OnboardingMotion = { html: string } | { lottie: () => Promise<{ default: unknown }> };

interface OnboardingSlide {
  title: string;
  description: string;
  motion: OnboardingMotion;
  /**
   * 이 장의 CTA 가 `다음` 대신 하는 일. 없으면 `다음` 버튼이다.
   * - share: 2장. "공유 시트에서 누크를 즐겨찾기하라" 는 안내라 그 자리에서 진짜 시트를 띄운다.
   * - instagram: 3장. 배운 대로 바로 해보게 인스타그램으로 보내고 온보딩을 끝낸다.
   */
  cta?: { label: string; tooltip: string; action: 'share' | 'instagram' };
}

/**
 * 가입 직후 1회 온보딩.
 *
 * 로그인 화면의 온보딩(`features/auth/components/OnboardingCarousel`)과 다른 화면이다 —
 * 저쪽은 로그인 전 서비스 소개고, 여기는 계정을 만든 사람에게 쓰는 법을 한 번 보여준다.
 */
// 최소 한 장은 있다는 걸 타입으로 못박는다 — 아래에서 `SLIDES[0]` 을 안전한 기본값으로 쓴다.
const SLIDES: [OnboardingSlide, ...OnboardingSlide[]] = [
  {
    title: '인스타그램 게시물로\n저장하고 싶은 공간들을 모아보세요',
    description: '앱을 열지 않고도 바로 저장할 수 있어요',
    motion: { html: '/onboarding/tutorial-1.html' },
  },
  {
    title: '누크를 즐겨찾기하고\n바로 저장해요',
    description: '이렇게 하면 저장이 2배 더 빨라져요!',
    motion: { html: '/onboarding/tutorial-2.html' },
    cta: { label: '설정하기', tooltip: '이 화면에서 바로 설정할 수 있어요!', action: 'share' },
  },
  {
    title: '이제 바로 저장해볼까요?\n인스타그램에서 게시물을 저장해보세요',
    description: '인스타그램 게시물을 바로 누크에 저장할 수 있어요',
    // 1MB 가까이 되는 JSON 이라 이 장에 도착했을 때 받는다.
    motion: { lottie: () => import('@/assets/lottie/onboarding_guide_3.json') },
    cta: { label: '저장하러 가기', tooltip: '인스타그램으로 이동해요!', action: 'instagram' },
  },
];

/**
 * 모션 HTML 은 `public/` 에 두고 iframe 으로 띄운다.
 *
 * 장당 4~5MB(대부분 인라인 base64 이미지)라 번들에 넣을 물건이 아니고, 파일 안에 제 CSS 와
 * 타임라인을 갖고 있어 우리 스타일과 섞이면 안 된다. 크기는 파일 안 `fitStage` 가 그릇에
 * 맞춰 스스로 조정한다.
 */
function MotionFrame({ src, title }: { src: string; title: string }) {
  return (
    <iframe
      src={src}
      title={title}
      // 프레임이 포인터를 먹으면 그 위에서 스와이프·탭이 죽는다. 보여주기만 하는 그림이다.
      className="pointer-events-none h-full w-full border-0"
      scrolling="no"
    />
  );
}

/** Lottie JSON 을 받아 재생한다. 받는 동안은 비워 둔다 — 그릇 크기는 부모가 잡고 있어 흔들리지 않는다. */
function LottieMotion({
  load,
  title,
}: {
  load: () => Promise<{ default: unknown }>;
  title: string;
}) {
  const [animationData, setAnimationData] = useState<unknown>(null);

  useEffect(() => {
    let alive = true;
    load()
      .then((module) => {
        if (alive) setAnimationData(module.default);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [load]);

  return animationData ? (
    <Lottie role="img" aria-label={title} animationData={animationData} className="h-full w-full" />
  ) : null;
}

/** 시안의 말풍선 — CTA 바로 위. 꼬리는 같은 색 정사각형을 45° 돌려 만든다. */
function CtaTooltip({ children }: { children: string }) {
  return (
    <div className="flex flex-col items-center pb-2">
      <p className="rounded-lg bg-gray-70 px-4 py-2 text-b2 font-semibold text-gray-0">
        {children}
      </p>
      <span aria-hidden="true" className="-mt-1 size-2 rotate-45 bg-gray-70" />
    </div>
  );
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const [slideIndex, setSlideIndex] = useState(0);
  // OS 공유 시트가 화면 아래쪽을 덮고 있는 동안. 시트는 네이티브 레이어라 높이를 알 수 없어,
  // 덮일 만한 것을 다 걷고 모션만 위에 남긴다 — 사용자가 시트를 조작하며 따라 볼 그림이다.
  const [sheetOpen, setSheetOpen] = useState(false);
  const slide = SLIDES[slideIndex] ?? SLIDES[0];

  // 온보딩을 떠나는 길은 모두 "봤음" 으로 기록한다 — 끝까지 봤든, 닫기(X)로 그만뒀든 다시 띄우지 않는다.
  const finish = () => {
    markOnboardingSeen();
    navigate('/map', { replace: true });
  };

  const showNext = () => {
    if (slideIndex < SLIDES.length - 1) setSlideIndex(slideIndex + 1);
    else finish();
  };

  /** 인스타그램을 먼저 열고 온보딩을 닫는다 — 돌아오면 지도에 있다. */
  const goToInstagram = () => {
    nativeBridge.openExternalUrl(INSTAGRAM_URL);
    finish();
  };

  /**
   * 진짜 공유 시트를 띄우고, 닫히면 다음 장으로 넘어간다.
   *
   * 공유했는지 그냥 닫았는지는 보지 않는다 — 즐겨찾기 설정은 시트 안에서 끝나고, 시트를 못 여는
   * 환경(브라우저)에서도 버튼이 죽으면 안 되기 때문이다.
   */
  const openShareSheet = async () => {
    setSheetOpen(true);
    await shareViaSystem(SHARE_TARGET);
    setSheetOpen(false);
    showNext();
  };

  return (
    <main
      // 로그인 화면과 달리 폭을 375 로 묶지 않는다 — 넓은 기기에서 좌우가 남으면 딤이 화면을
      // 다 덮지 못하고, 그림도 실제 공유 시트보다 좁게 깔려 따라 하기 어려워진다.
      className="relative flex h-dvh w-full flex-col overflow-hidden bg-gray-0"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        // 로그인 화면과 같은 기준: 홈 인디케이터(34) + 8. 홈 버튼 기기에는 최소값을 준다.
        paddingBottom: 'max(1rem, calc(0.5rem + env(safe-area-inset-bottom)))',
      }}
    >
      <div className="flex justify-end px-4 pt-2">
        <button
          type="button"
          aria-label="온보딩 닫기"
          onClick={finish}
          className="rounded-full text-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100"
        >
          <Icon24Close />
        </button>
      </div>

      {/* 시트가 떠 있는 동안 모션을 띄워 보이게 하는 딤. 페이지 안에 깔아 모션만 그 위로
          올린다 — 시트가 올라오며 OS 가 거는 딤과 겹치지만, 그건 화면 전체를 고르게 덮어
          모션과 배경의 대비를 만들어 주지는 않는다. 닫기 버튼은 계속 눌려야 해서 포인터는 통과시킨다.
          시트가 올라오는 동안 같이 짙어지게 항상 붙여 두고 투명도만 바꾼다. */}
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-0 z-10 bg-gray-100/30 transition-opacity duration-300 ease-out motion-reduce:transition-none',
          sheetOpen ? 'opacity-100' : 'opacity-0',
        )}
      />

      {/* 장 넘김: 문구와 그림만 한 줄로 늘어놓고 왼쪽으로 민다. 점·말풍선·CTA 는 아래에 고정이라
          내용만 바뀐다(로그인 화면 온보딩과 같은 구조).
          z-20 은 딤 위에 올라서기 위한 것이다 — translateX 가 이 줄을 하나의 쌓임 맥락으로 묶어서,
          안쪽 그림에만 z 를 주면 딤 아래로 깔린다. 줄 자체가 투명해서 그림 밖은 딤이 그대로 비친다. */}
      <div className="relative z-20 flex min-h-0 flex-1 overflow-hidden">
        <div
          className="flex w-full min-h-0 transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none"
          style={{ transform: `translateX(-${slideIndex * 100}%)` }}
        >
          {SLIDES.map((item, index) => {
            const active = index === slideIndex;
            // 그림은 무겁다(iframe 4~5MB, Lottie 1MB). 들어올 다음 장과 막 나간 이전 장만 그려 두고
            // 나머지는 비운다 — 밀려 들어오는 순간에 이미 떠 있어야 빈 칸이 스치지 않는다.
            const mountMotion = Math.abs(index - slideIndex) <= 1;
            const collapsed = active && sheetOpen;
            return (
              <section
                key={item.title}
                className="flex w-full min-h-0 shrink-0 flex-col"
                // 화면 밖 장은 포커스·낭독에서 뺀다(jsdom 은 inert 를 반영하지 않아 aria-hidden 을 같이 건다).
                inert={!active || undefined}
                aria-hidden={!active || undefined}
              >
                {/* 시트가 열릴 때 문구는 없애지 않고 자리를 접는다 — 언마운트하면 그림이 위로
                    순간이동한다. 0fr/1fr 은 내용 높이를 모르고도 접을 수 있는 방법이다. */}
                <div
                  className={cn(
                    'grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none',
                    collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]',
                  )}
                  aria-hidden={collapsed || undefined}
                >
                  <div
                    className={cn(
                      'overflow-hidden transition-opacity duration-200 ease-out motion-reduce:transition-none',
                      collapsed && 'opacity-0',
                    )}
                  >
                    <h1 className="whitespace-pre-line px-4 pt-6 text-center text-h1 font-extrabold text-gray-100">
                      {item.title}
                    </h1>
                    <p className="px-4 pt-3 text-center text-b2 text-gray-50">{item.description}</p>
                  </div>
                </div>

                {/* 평소엔 줄어드는 쪽이 그림이다 — 세로가 짧은 기기에서 문구와 버튼이 밀리지 않게 한다.
                    시트가 떠 있을 때는 시트 위에 남는 만큼만 차지한다. iOS 공유 시트가 화면의 60% 안팎을
                    덮으므로, 상단 34% 면 안전 영역과 닫기 버튼을 빼고도 가려지지 않는다.
                    높이를 바꾸는 대신 상한(max-height)만 줄여 전환한다 — flex-1 이 준 높이는 애니메이션할 수
                    없지만 상한은 된다. 모션 파일이 제 그릇 크기를 보고 스스로 다시 맞추므로(fitStage 의 resize)
                    그림도 같이 줄며 따라 올라온다.
                    -mt-6 은 그 파일이 남기는 위쪽 여백(-48 을 위아래로 나눈 24px)을 되돌려, 그림 윗변이
                    닫기 버튼 바로 아래에 붙게 한다. */}
                <div
                  className={cn(
                    'min-h-0 flex-1 transition-[max-height,margin-top] duration-300 ease-out motion-reduce:transition-none',
                    collapsed ? '-mt-6 max-h-[34dvh]' : 'mt-6 max-h-[100dvh]',
                  )}
                >
                  {mountMotion ? (
                    'html' in item.motion ? (
                      <MotionFrame src={item.motion.html} title={item.description} />
                    ) : (
                      <LottieMotion load={item.motion.lottie} title={item.description} />
                    )
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {/* 점과 CTA 는 자리를 접지 않고 사라지기만 한다 — 그림 아래라 접어도 그림이 움직이지 않고,
          어차피 올라온 시트가 덮는 자리다. */}
      <div
        className={cn(
          'transition-opacity duration-200 ease-out motion-reduce:transition-none',
          sheetOpen && 'opacity-0',
        )}
        inert={sheetOpen || undefined}
        aria-hidden={sheetOpen || undefined}
      >
        <CarouselIndicator count={SLIDES.length} activeIndex={slideIndex} className="pt-6" />

        <div className="px-4 pt-6">
          {/* 말풍선 자리는 모든 장에서 비워 둔다 — 말풍선이 없는 1장만 이 높이만큼 아래 블록이 낮아져
              점이 장마다 다른 높이에 찍혔다. 없는 장에서는 투명하게 두고 낭독에서 뺀다. */}
          <div
            className={cn(
              'transition-opacity duration-500 ease-out motion-reduce:transition-none',
              !slide.cta && 'opacity-0',
            )}
            aria-hidden={!slide.cta || undefined}
          >
            <CtaTooltip>{slide.cta?.tooltip ?? '\u00a0'}</CtaTooltip>
          </div>
          <Button
            size="lg"
            fullWidth
            onClick={
              slide.cta?.action === 'share'
                ? () => void openShareSheet()
                : slide.cta?.action === 'instagram'
                  ? goToInstagram
                  : showNext
            }
          >
            {slide.cta?.label ?? '다음'}
          </Button>
        </div>
      </div>
    </main>
  );
}
