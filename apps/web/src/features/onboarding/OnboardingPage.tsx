import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { markOnboardingSeen } from '@/features/onboarding/onboardingSeen';
import { shareViaSystem } from '@/features/share/lib/shareUrl';
import { nativeBridge } from '@/native-bridge';
import { env } from '@/shared/config/env';
import { Icon24Close } from '@/shared/icons/NookIcons';
import { useHorizontalSwipe } from '@/shared/lib/useHorizontalSwipe';
import { cn } from '@/shared/lib/utils';
import { Button, CarouselIndicator, Lottie } from '@/shared/ui';

/** 2장이 여는 공유 시트의 대상. 무엇을 공유하든 상관없다 — 시트를 띄우는 것 자체가 목적이다. */
const SHARE_TARGET = { title: 'nook', url: env.webOrigin };

/**
 * 3장이 보내는 누크 공식 계정의 게시물. https 주소 그대로 연다 — 인스타그램이 이 도메인을 앱 링크로
 * 등록해 둬서, 앱이 깔려 있으면 앱으로, 없으면 브라우저로 열린다(`nativeBridge.openExternalUrl`).
 * `instagram://` 스킴을 쓰지 않는 이유: iOS 는 설치 확인에 Info.plist 등록과 셸 재빌드가 필요하고,
 * 스킴 주소에는 `stkn` 을 실을 수 없다.
 */
const INSTAGRAM_URL = 'https://www.instagram.com/p/DcTo_cCD-G8/?stkn=YWRzcjE2d3lrOGdi';

/**
 * 가운데 그림. 모두 Lottie JSON 이다.
 *
 * 처음에는 디자이너가 준 HTML(장당 3.5~4.8MB, 대부분 인라인 base64 사진)을 iframe 으로
 * 띄웠는데, 받고 디코딩하는 동안 빈 자리였고 파일 안 스크립트가 배율을 정할 때까지 CSS 기본
 * 배율로 크게 그려졌다. Lottie 로 바꾸니 228~1282KB 로 줄고 배율 계산도 사라졌다.
 */
interface OnboardingMotion {
  lottie: () => Promise<{ default: unknown }>;
  /**
   * 그림 폭. 없으면 장 전체 폭이다. Lottie 는 제 여백을 남기지 않아 시안 폭을 그대로 준다.
   * 세로가 모자란 기기에서는 높이 쪽에 맞춰 더 작아진다.
   */
  frameClassName?: string;
}

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
    // 첫 화면이라 가장 빨리 떠야 하는 장이다(395KB). 무대는 215×466.
    // `p-6` 은 그릇 사방 24px 여백 — 그림이 화면 폭을 꽉 채우지 않게 한다.
    motion: {
      lottie: () => import('@/assets/lottie/onboarding_guide_1.json'),
      frameClassName: 'p-6',
    },
  },
  {
    title: '누크를 즐겨찾기하고\n바로 저장해요',
    description: '이렇게 하면 저장이 2배 더 빨라져요!',
    // 시안: 375 폭 화면에서 270×279(원본 215×222 와 같은 비율). 화면 폭의 72%(270/375)에
    // 파일이 남기는 좌우 여백 48px(3rem)을 더한 폭을 준다.
    //
    // Android 는 공유 시트 모양이 아예 달라 디자이너가 따로 그렸다. 어느 OS 위에서 도는지는
    // 셸이 로드 전에 심어 준 값(`nativeBridge.platform`)으로 이미 알고 있어, 화면을 그리기 전에
    // 갈라진다 — 그림이 바뀌어 보이는 깜빡임이 없다. 양쪽 모두 Lottie 라 폭 보정(+3rem)이
    // 필요 없다. iOS 판 228KB, Android 판 1.25MB.
    motion:
      nativeBridge.platform === 'android'
        ? {
            lottie: () => import('@/assets/lottie/onboarding_guide_2_android.json'),
            frameClassName: 'w-[72%]',
          }
        : {
            lottie: () => import('@/assets/lottie/onboarding_guide_2.json'),
            frameClassName: 'w-[72%]',
          },
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

/** Lottie JSON 을 받아 재생한다. 받는 동안은 비워 둔다 — 그릇 크기는 부모가 잡고 있어 흔들리지 않는다. */
function LottieMotion({
  load,
  title,
  className,
}: {
  load: () => Promise<{ default: unknown }>;
  title: string;
  className?: string;
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
    <Lottie
      role="img"
      aria-label={title}
      animationData={animationData}
      className={cn('mx-auto h-full w-full', className)}
    />
  ) : null;
}

/** 그림이 공유 시트 위로 올라가는 시간 — 그림 그릇의 `duration-300` 과 맞춘다. */
const MOTION_MS = 300;

/**
 * iOS 공유 시트는 호출 뒤 첫 상승 프레임까지 약 300ms가 걸린다(실기기 녹화 기준).
 * 그림도 그때 줄기 시작해야 두 움직임이 한 동작처럼 보인다.
 */
const SHARE_SHEET_PRESENTATION_DELAY_MS = 300;

/**
 * 시트가 떠 있을 때 그림 폭 — 시안은 375 폭 화면에서 244×252 지만, 그 크기면 그림 아랫변이
 * 시트에 닿아 붙어 보인다. 비율을 지킨 채 8px 만큼 줄여(236×244) 아래에 그만큼 틈을 둔다.
 * 그림 윗변은 `transform-origin` 이 잡고 있어 제자리이므로, 줄인 만큼이 그대로 간격이 된다.
 */
const SHEET_ART_WIDTH_RATIO = 236 / 375;

/** 세로가 짧은 기기에서의 상한. iOS 공유 시트가 화면의 60% 안팎을 덮는다. */
const SHEET_ART_MAX_HEIGHT_RATIO = 0.34;

/**
 * 그릇 안에서 Lottie 가 실제로 그린 영역. svg 는 그릇을 꽉 채우지만 그림은 그 안에서 원본
 * 비율(`viewBox`)대로 놓이므로, 그릇째 재면 레터박스 여백까지 그림으로 세게 된다.
 */
function artRect(box: HTMLElement) {
  const svg = box.querySelector('svg');
  const rect = svg?.getBoundingClientRect();
  const view = svg?.viewBox.baseVal;
  if (!rect?.width || !rect.height || !view?.width || !view.height) return null;

  // lottie-react 는 `preserveAspectRatio: xMidYMid meet` — 짧은 쪽에 맞추고 가운데 정렬한다.
  const fit = Math.min(rect.width / view.width, rect.height / view.height);
  const width = view.width * fit;
  const height = view.height * fit;
  return {
    top: rect.top + (rect.height - height) / 2,
    width,
    height,
    centerX: rect.left + rect.width / 2,
  };
}

/**
 * 시트가 떠 있는 동안 그림을 위로 올려 줄인다. 돌려받은 함수를 부르면 제자리로 돌아간다.
 *
 * 그릇 크기 대신 transform 만 건다 — 크기를 바꾸면 Lottie 가 매 프레임 다시 레이아웃된다.
 * 벡터라 transform 으로 줄여도 선명하다. (HTML/iframe 시절에는 비트맵이 흐려져서, 전환이
 * 끝난 뒤 안쪽 무대를 목표 배율로 다시 그리고 바깥 transform 을 바꿔 끼우는 보정이 필요했다.)
 *
 * 목표는 그림 윗변이 문구 자리 윗변(닫기 버튼 바로 아래)에 붙고, 크기는 시안의 244×252.
 * 폭 기준으로 줄이고(원본 비율은 그대로 따라온다), 세로가 짧은 기기에서는 시트가 덮지 않는
 * 위쪽 34% 안에 들어가도록 더 줄인다. 그림 크기는 `artRect` 로 실제 그려진 만큼만 잰다 —
 * 그릇으로 재면 레터박스까지 줄여 그림이 필요 이상으로 작아진다.
 */
function liftMotion(box: HTMLElement): () => void {
  const boxRect = box.getBoundingClientRect();
  const art = artRect(box) ?? {
    top: boxRect.top,
    width: boxRect.width,
    height: boxRect.height,
    centerX: boxRect.left + boxRect.width / 2,
  };
  const anchorTop = box.parentElement?.getBoundingClientRect().top ?? art.top;
  const scale = Math.min(
    1,
    (window.innerWidth * SHEET_ART_WIDTH_RATIO) / art.width,
    (window.innerHeight * SHEET_ART_MAX_HEIGHT_RATIO) / art.height,
  );
  // jsdom 처럼 크기가 0 이면 옮기지 않는다.
  if (!(scale > 0 && Number.isFinite(scale))) return () => undefined;

  box.style.transformOrigin = `${art.centerX - boxRect.left}px ${art.top - boxRect.top}px`;
  box.style.transform = `translateY(${anchorTop - art.top}px) scale(${scale})`;

  return () => {
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
  /**
   * 지금 보고 있는 장은 URL 이 갖는다(`?slide=`).
   *
   * 다른 앱에 다녀오는 동안 WebView 가 회수되면 돌아올 때 같은 주소로 다시 로드된다 — 이때
   * 컴포넌트 state 는 사라지지만 URL 은 남으므로, 어느 장에서 나갔든 그 장으로 돌아온다.
   * 지도가 선택한 장소·시트 높이를 `?placeId=`·`?snap=` 으로 싣는 것과 같은 원칙이다.
   */
  const [searchParams, setSearchParams] = useSearchParams();
  const parsed = Number(searchParams.get('slide'));
  const slideIndex = Number.isInteger(parsed)
    ? Math.min(Math.max(parsed, 0), SLIDES.length - 1)
    : 0;

  const goToSlide = (index: number) => {
    const next = new URLSearchParams(searchParams);
    next.set('slide', String(index));
    // 장 넘김은 히스토리에 쌓지 않는다 — 쌓으면 뒤로가기가 온보딩 안에서 겉돈다.
    setSearchParams(next, { replace: true });
  };
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

  // 온보딩을 떠나는 길. 어느 장에서 닫기(X)를 눌렀든 "봤음" 으로 기록한다 — 그만 보겠다는 선택이다.
  const finish = () => {
    markOnboardingSeen();
    navigate('/map', { replace: true });
  };

  const showNext = () => {
    if (slideIndex < SLIDES.length - 1) goToSlide(slideIndex + 1);
    else finish();
  };

  /**
   * 인스타그램으로 보낸다. "봤음" 으로 기록하지만 화면은 그대로 3장에 둔다 — 인스타그램에서
   * 돌아온 사람이 지도가 아니라 방금 보던 안내를 다시 보고, 나갈 때는 닫기(X)로 나간다.
   */
  const goToInstagram = () => {
    markOnboardingSeen();
    nativeBridge.openExternalUrl(INSTAGRAM_URL);
  };

  // 쓸어 넘기기는 장만 옮긴다 — CTA 동작(공유 시트·인스타그램)은 버튼을 눌렀을 때만 한다.
  // 그래서 2장에서 밀면 시트 없이 바로 3장이고, 마지막 장에서 더 밀어도 온보딩을 끝내지 않는다.
  const swipe = useHorizontalSwipe({
    enabled: !sheetOpen,
    onSwipeLeft: () => goToSlide(Math.min(slideIndex + 1, SLIDES.length - 1)),
    onSwipeRight: () => goToSlide(Math.max(slideIndex - 1, 0)),
  });
  // 넘길 장이 없는 쪽으로는 따라가지 않는다 — 빈 자리가 끌려 들어온다.
  const dragOffset =
    (swipe.offset < 0 && slideIndex === SLIDES.length - 1) || (swipe.offset > 0 && slideIndex === 0)
      ? 0
      : swipe.offset;

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
      <div className="relative z-20 flex min-h-0 flex-1 overflow-hidden" {...swipe.handlers}>
        <div
          className={cn(
            'flex w-full min-h-0 transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none',
            // 끄는 동안에는 손가락을 그대로 따라간다. 놓으면 다시 transition 으로 자리를 찾는다.
            dragOffset !== 0 && 'transition-none',
          )}
          style={{ transform: `translateX(calc(-${slideIndex * 100}% + ${dragOffset}px))` }}
        >
          {SLIDES.map((item, index) => {
            const active = index === slideIndex;
            // 들어올 다음 장과 막 나간 이전 장만 그려 두고 나머지는 비운다 — 밀려 들어오는
            // 순간에 이미 떠 있어야 빈 칸이 스치지 않는다. 자산이 Lottie 가 되며 무게는 문제가
            // 아니게 됐지만(장당 228KB~1.25MB), Lottie 는 마운트된 장을 계속 재생하므로 안 보이는
            // 장까지 올려 두면 그만큼 CPU 를 쓴다. 3장뿐이라 실제로 아끼는 건 한 장이다.
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
                    그릇(flex-1)이 커지며 그림이 매 프레임 다시 레이아웃된다. 그림은 transform 으로
                    그 위를 덮는다(`liftMotion`). */}
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
                    <LottieMotion
                      load={item.motion.lottie}
                      title={item.description}
                      className={item.motion.frameClassName}
                    />
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
