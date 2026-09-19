import { useEffect, useRef, useState } from 'react';
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

/** 모션 파일의 무대(Figma 1배 크기로 그린 그림 전체). 1장은 `.stage`, 2장은 `.nook-stage` 다. */
const STAGE_SELECTOR = '.stage, .nook-stage';

/**
 * 무대를 `transform: scale` 대신 `zoom` 으로 키운다.
 *
 * 모션 파일은 215px 무대를 `transform: scale(--stage-scale)` 로 2~3배 키운다. 무대 안에 무한
 * 애니메이션·backdrop-filter 가 있어 WebKit 이 이를 합성 레이어로 떼면, 215px 비트맵을 늘려
 * 보여줘서 흐리다. 같은 배율을 `zoom` 으로 주면 레이아웃 단계에서 실제 크기로 그려 선명하다.
 * `--stage-scale` 은 파일의 `fitStage` 가 계속 넣으므로 크기 맞춤은 그대로 파일이 한다.
 * 파일을 고치지 않고 밖에서 덮는다 — 디자이너가 파일을 새로 줘도 다시 손댈 필요가 없다.
 */
function sharpenStage(frame: HTMLIFrameElement) {
  const doc = frame.contentDocument;
  if (!doc) return;
  const style = doc.createElement('style');
  style.textContent = `${STAGE_SELECTOR} { transform: none !important; zoom: var(--stage-scale); }`;
  doc.head.append(style);
}

/**
 * 모션 HTML 은 `public/` 에 두고 iframe 으로 띄운다.
 *
 * 장당 4~5MB(대부분 인라인 base64 이미지)라 번들에 넣을 물건이 아니고, 파일 안에 제 CSS 와
 * 타임라인을 갖고 있어 우리 스타일과 섞이면 안 된다. 크기는 파일 안 `fitStage` 가 그릇에
 * 맞춰 스스로 조정한다. 같은 출처라 로드 뒤 안을 만질 수 있다(`sharpenStage`).
 */
function MotionFrame({ src, title }: { src: string; title: string }) {
  return (
    <iframe
      src={src}
      title={title}
      onLoad={(event) => sharpenStage(event.currentTarget)}
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

/** 그림이 공유 시트 위로 올라가는 시간 — 그림 그릇의 `duration-300` 과 맞춘다. */
const MOTION_MS = 300;

/**
 * iOS 공유 시트는 호출 뒤 첫 상승 프레임까지 약 300ms가 걸린다(실기기 녹화 기준).
 * 그림도 그때 줄기 시작해야 두 움직임이 한 동작처럼 보인다.
 */
const SHARE_SHEET_PRESENTATION_DELAY_MS = 300;

/** transition 없이 transform 을 바꿔 끼운다. 같은 모습끼리 바꾸는 것이라 움직이면 안 된다. */
function swapTransform(box: HTMLElement, transform: string) {
  box.style.transition = 'none';
  box.style.transform = transform;
  // 스타일을 여기서 확정해야 다음 변경부터 다시 transition 이 걸린다.
  box.getBoundingClientRect();
  box.style.transition = '';
}

/**
 * 시트가 떠 있는 동안 그림을 위로 올려 줄인다. 돌려받은 함수를 부르면 제자리로 돌아간다.
 *
 * 전환 중에는 그릇에 transform 만 건다 — 그릇 크기를 바꾸면 iframe 이 매 프레임 리사이즈되고,
 * 모션 파일의 `fitStage` 가 무거운 문서 전체를 다시 그려 버벅인다. 대신 transform 은 원래
 * 크기로 그린 비트맵을 줄이는 것이라 살짝 흐리다. 그래서 전환이 끝나면 한 번만 안쪽 무대를
 * 목표 배율로 다시 그리고(선명) 바깥은 옮기기만 하도록 바꿔 끼운다. 돌아갈 때는 반대로 바꿔
 * 끼운 뒤 푼다. 두 모습은 위치·크기가 같아 바꿔 끼우는 순간은 보이지 않는다.
 *
 * 목표는 그림 윗변이 문구 자리 윗변(닫기 버튼 바로 아래)에 붙고, 높이는 화면의 34%(iOS 공유
 * 시트가 60% 안팎을 덮는다)에서 모션 파일이 위아래로 남기는 24px 씩을 뺀 만큼. iframe 은 같은
 * 출처라 안의 실제 그림(`.viewport`)을 잴 수 있다 — 그릇째 재면 레터박스 여백까지 줄어 그림이
 * 더 작아진다. 못 재면 그릇을 그림으로 보고, 다시 그리기 없이 transform 만 쓴다.
 */
function liftMotion(box: HTMLElement): () => void {
  const boxRect = box.getBoundingClientRect();
  const frame = box.querySelector('iframe');
  const frameRect = frame?.getBoundingClientRect();
  const doc = frame?.contentDocument;
  const viewport = doc?.querySelector<HTMLElement>('.viewport');
  const stage = doc?.querySelector<HTMLElement>(STAGE_SELECTOR);
  const stageRect = viewport?.getBoundingClientRect();
  const art =
    frameRect && stageRect
      ? {
          top: frameRect.top + stageRect.top,
          height: stageRect.height,
          centerX: frameRect.left + stageRect.left + stageRect.width / 2,
        }
      : { top: boxRect.top, height: boxRect.height, centerX: boxRect.left + boxRect.width / 2 };
  const anchorTop = box.parentElement?.getBoundingClientRect().top ?? art.top;
  const scale = Math.min(1, (window.innerHeight * 0.34 - 48) / art.height);
  // jsdom 처럼 크기가 0 이면 옮기지 않는다.
  if (!(scale > 0 && Number.isFinite(scale))) return () => undefined;

  const scaled = `translateY(${anchorTop - art.top}px) scale(${scale})`;
  box.style.transformOrigin = `${art.centerX - boxRect.left}px ${art.top - boxRect.top}px`;
  box.style.transform = scaled;

  let unsharpen: (() => void) | undefined;
  const timer = window.setTimeout(() => {
    if (!viewport || !stage) return;
    const { width, height } = viewport.style;
    const stageScale = stage.style.getPropertyValue('--stage-scale');
    viewport.style.width = `${Number.parseFloat(width) * scale}px`;
    viewport.style.height = `${Number.parseFloat(height) * scale}px`;
    stage.style.setProperty('--stage-scale', String(Number.parseFloat(stageScale) * scale));
    // 줄어든 그림은 iframe 가운데에 다시 놓인다(파일이 가운데 정렬한다) — 윗변을 제자리로 옮긴다.
    const sharpTop = art.top + (art.height * (1 - scale)) / 2;
    swapTransform(box, `translateY(${anchorTop - sharpTop}px)`);
    unsharpen = () => {
      viewport.style.width = width;
      viewport.style.height = height;
      stage.style.setProperty('--stage-scale', stageScale);
      swapTransform(box, scaled);
    };
  }, MOTION_MS);

  return () => {
    window.clearTimeout(timer);
    unsharpen?.();
    box.style.transform = '';
  };
}

/** 시안의 말풍선 — CTA 바로 위. 꼬리는 같은 색 정사각형을 45° 돌려 만든다. */
function CtaTooltip({ children }: { children: string }) {
  return (
    <div className="flex flex-col items-center pb-2">
      <p className="rounded-[20px] bg-gray-80 px-4 py-2 text-b2 font-semibold text-gray-0">
        {children}
      </p>
      <span aria-hidden="true" className="-mt-1 size-2 rotate-45 bg-gray-80" />
    </div>
  );
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const [slideIndex, setSlideIndex] = useState(0);
  // OS 공유 시트가 화면 아래쪽을 덮고 있는 동안. 시트는 네이티브 레이어라 높이를 알 수 없어,
  // 덮일 만한 것을 다 걷고 모션만 위에 남긴다 — 사용자가 시트를 조작하며 따라 볼 그림이다.
  const [sheetOpen, setSheetOpen] = useState(false);
  // 그림이 시트 위로 올라가 있는 동안(`liftMotion`). 시트와 따로 두는 이유: 시트가 닫히면
  // 그림이 먼저 돌아오고, 그다음에 다음 장으로 넘어간다.
  const [lifted, setLifted] = useState(false);
  // 2장에서 시트를 한 번 닫았다. 그 뒤로 2장 CTA 는 `다음` 이 되고, 위에 `다시 설정하기` 가 붙는다.
  const [shareDone, setShareDone] = useState(false);
  const motionBoxes = useRef<(HTMLDivElement | null)[]>([]);
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
   * 진짜 공유 시트를 띄우고, 닫히면 그림을 제자리로 돌려 놓는다. 다음 장으로는 넘기지 않고
   * CTA 를 `다음` 으로 바꾼다 — 넘어갈지, `다시 설정하기` 로 한 번 더 열지는 사용자가 고른다.
   * `설정하기` 와 `다시 설정하기` 가 같이 쓴다.
   *
   * 공유했는지 그냥 닫았는지는 보지 않는다 — 즐겨찾기 설정은 시트 안에서 끝나고, 시트를 못 여는
   * 환경(브라우저)에서도 버튼이 죽으면 안 되기 때문이다.
   */
  const openShareSheet = async () => {
    setSheetOpen(true);
    // 네이티브 호출을 먼저 보낸다. 실기기에서는 호출 후 시트가 화면에 나타나기까지 약 300ms가
    // 걸리므로, 그림도 그 시점부터 줄여 두 움직임을 겹친다.
    let lower: (() => void) | undefined;
    let didLift = false;
    const sharing = shareViaSystem(SHARE_TARGET);
    const liftTimer = window.setTimeout(() => {
      const box = motionBoxes.current[slideIndex];
      lower = box ? liftMotion(box) : undefined;
      didLift = true;
      setLifted(true);
    }, SHARE_SHEET_PRESENTATION_DELAY_MS);

    await sharing;
    window.clearTimeout(liftTimer);
    if (didLift) {
      lower?.();
      setLifted(false);
      // 돌아오는 동안 CTA·딤은 그대로 둔다 — 그림이 자리를 잡은 뒤에 `다음` 이 드러난다.
      await new Promise((resolve) => setTimeout(resolve, MOTION_MS));
    }
    setSheetOpen(false);
    setShareDone(true);
  };

  // 설정을 마친 2장은 CTA 가 없는 장처럼 `다음` 으로 넘긴다(말풍선도 걷는다).
  const retryShare = slide.cta?.action === 'share' && shareDone;
  const cta = retryShare ? undefined : slide.cta;

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
            const collapsed = active && lifted;
            return (
              <section
                key={item.title}
                className="flex w-full min-h-0 shrink-0 flex-col"
                // 화면 밖 장은 포커스·낭독에서 뺀다(jsdom 은 inert 를 반영하지 않아 aria-hidden 을 같이 건다).
                inert={!active || undefined}
                aria-hidden={!active || undefined}
              >
                {/* 시트가 열릴 때 문구는 자리를 그대로 두고 흐려지기만 한다 — 자리를 접으면 아래
                    그릇(flex-1)이 커지며 iframe 이 매 프레임 리사이즈된다. 그림이 transform 으로 그 위를 덮는다. */}
                <div
                  className={cn(
                    'transition-opacity duration-200 ease-out motion-reduce:transition-none',
                    collapsed && 'opacity-0',
                  )}
                  aria-hidden={collapsed || undefined}
                >
                  <h1 className="whitespace-pre-line px-4 pt-6 text-center text-h1 font-extrabold text-gray-90">
                    {item.title}
                  </h1>
                  <p className="px-4 pt-3 text-center text-b2 font-medium text-gray-70">
                    {item.description}
                  </p>
                </div>

                {/* 평소엔 줄어드는 쪽이 그림이다 — 세로가 짧은 기기에서 문구와 버튼이 밀리지 않게 한다.
                    시트가 떠 있을 때는 `liftMotion` 이 transform 으로 올려 줄인다. */}
                <div
                  ref={(node) => {
                    motionBoxes.current[index] = node;
                  }}
                  className="mt-6 min-h-0 flex-1 transition-transform duration-300 ease-out motion-reduce:transition-none"
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
              점이 장마다 다른 높이에 찍혔다. 없는 장에서는 투명하게 두고 낭독에서 뺀다.
              `다시 설정하기` 도 같은 칸에 겹쳐 둔다 — 말풍선과 번갈아 나타나도 점이 움직이지 않는다. */}
          <div className="grid">
            <div
              className={cn(
                // 누를 일 없는 장식이다. 투명도가 1 미만이면 위층에 그려져서, 탭을 통과시키지 않으면
                // 같은 칸에 겹친 `다시 설정하기` 가 안 눌린다.
                'pointer-events-none [grid-area:1/1] transition-opacity duration-500 ease-out motion-reduce:transition-none',
                !cta && 'opacity-0',
              )}
              aria-hidden={!cta || undefined}
            >
              <CtaTooltip>{cta?.tooltip ?? '\u00a0'}</CtaTooltip>
            </div>
            {retryShare ? (
              // 시안: 버튼 위 17px. 간격 토큰(4px 배수)에 맞춰 16px 로 둔다.
              <button
                type="button"
                onClick={() => void openShareSheet()}
                className="[grid-area:1/1] self-end justify-self-center pb-4 text-b2 font-medium text-gray-90 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100"
              >
                다시 설정하기
              </button>
            ) : null}
          </div>
          <Button
            size="lg"
            fullWidth
            onClick={
              cta?.action === 'share'
                ? () => void openShareSheet()
                : cta?.action === 'instagram'
                  ? goToInstagram
                  : showNext
            }
          >
            {cta?.label ?? '다음'}
          </Button>
        </div>
      </div>
    </main>
  );
}
