import type { LottieRefCurrentProps } from 'lottie-react';
import { useEffect, useRef, useState } from 'react';
import { CarouselIndicator } from '@/shared/ui/carousel-indicator';
import { Lottie } from '@/shared/ui/lottie';

/**
 * 온보딩 3장. 일러스트는 디자이너가 준 Lottie 를 그대로 재생한다.
 *
 * JSON 이 장당 0.6~2.2MB(대부분 base64 이미지)라 정적 import 로 묶으면 로그인 진입에
 * 4MB 를 통째로 기다리게 된다 — 동적 import 로 쪼개 현재 장과 다음 장만 받는다.
 */
const SLIDES = [
  {
    title: '발견한 장소를 누크에 쏙!',
    description: '인스타그램에서 마음에 드는 장소를 발견하고\n누크로 가져와 보세요.',
    load: () => import('@/assets/lottie/onboarding_1.json'),
  },
  {
    title: '게시물 속 장소를 지도에!',
    description: '지도에서 게시물과 장소를 함께 보며\n가고 싶은 곳을 둘러보세요.',
    load: () => import('@/assets/lottie/onboarding_2.json'),
  },
  {
    title: '나만의 아카이브를 만들어요',
    description: '발견한 장소를 취향대로 모아 저장하고\n필요할 때 빠르게 찾아보세요.',
    load: () => import('@/assets/lottie/onboarding_3.json'),
  },
] as const;

const SWIPE_THRESHOLD = 36;

/** 현재 장과 바로 다음 장만 받아 둔다. 실패한 장은 다시 요청할 수 있게 표시를 지운다. */
function useOnboardingAnimations(activeIndex: number) {
  const [animations, setAnimations] = useState<Record<number, unknown>>({});
  const requested = useRef(new Set<number>());

  useEffect(() => {
    for (const index of [activeIndex, activeIndex + 1]) {
      const slide = SLIDES[index];
      if (!slide || requested.current.has(index)) continue;
      requested.current.add(index);
      slide
        .load()
        .then((module) => setAnimations((prev) => ({ ...prev, [index]: module.default })))
        .catch(() => requested.current.delete(index));
    }
  }, [activeIndex]);

  return animations;
}

function OnboardingSlide({
  title,
  description,
  animationData,
  active,
}: {
  title: string;
  description: string;
  animationData: unknown;
  active: boolean;
}) {
  const lottieRef = useRef<LottieRefCurrentProps | null>(null);

  // 보이지 않는 장까지 계속 돌면 저사양 기기에서 스와이프가 버벅인다.
  useEffect(() => {
    const lottie = lottieRef.current;
    if (!lottie) return;
    if (active) lottie.play();
    else lottie.pause();
  }, [active]);

  return (
    <div aria-hidden={!active} className="flex h-full w-full shrink-0 flex-col justify-center">
      {/* 시안 캔버스가 375x400 이라 비율을 고정해, 로딩 전에도 자리가 흔들리지 않게 한다.
          다만 세로가 짧은 기기(SE 등)에서는 이 400 이 그대로 들어가지 않아 문구가 잘렸다 —
          줄어드는 쪽을 일러스트로 몰아 두고(min-h-0) 문구는 shrink-0 으로 지킨다. */}
      <div className="mx-auto aspect-[375/400] w-full min-h-0 max-w-[375px]">
        {animationData ? (
          <Lottie
            lottieRef={lottieRef}
            animationData={animationData}
            autoplay={active}
            className="h-full w-full"
          />
        ) : null}
      </div>

      <h2 className="mt-2 shrink-0 text-center text-h1 font-extrabold text-gray-100">{title}</h2>
      <p className="mt-3 shrink-0 whitespace-pre-line text-center text-b2 text-gray-50">
        {description}
      </p>
    </div>
  );
}

export const ONBOARDING_SLIDE_COUNT = SLIDES.length;

interface OnboardingCarouselProps {
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
}

/** 현재 장은 바깥(LoginPage)이 들고 있다 — 하단 CTA 가 마지막 장인지에 따라 달라져서다. */
export function OnboardingCarousel({ activeIndex, onActiveIndexChange }: OnboardingCarouselProps) {
  const pointerStartX = useRef<number | null>(null);
  const animations = useOnboardingAnimations(activeIndex);

  const showPrevious = () => onActiveIndexChange(Math.max(0, activeIndex - 1));
  const showNext = () => onActiveIndexChange(Math.min(SLIDES.length - 1, activeIndex + 1));

  return (
    <section
      aria-roledescription="carousel"
      aria-label="누크 서비스 소개"
      className="flex min-h-0 flex-1 touch-pan-y flex-col justify-center"
      onPointerDown={(event) => {
        pointerStartX.current = event.clientX;
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerUp={(event) => {
        if (pointerStartX.current === null) return;
        const distance = event.clientX - pointerStartX.current;
        pointerStartX.current = null;
        if (distance > SWIPE_THRESHOLD) showPrevious();
        if (distance < -SWIPE_THRESHOLD) showNext();
      }}
      onPointerCancel={() => {
        pointerStartX.current = null;
      }}
    >
      <div className="min-h-0 overflow-hidden">
        <div
          className="flex h-full transition-transform duration-300 ease-out motion-reduce:transition-none"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {SLIDES.map(({ title, description }, index) => (
            <OnboardingSlide
              key={title}
              title={title}
              description={description}
              animationData={animations[index]}
              active={index === activeIndex}
            />
          ))}
        </div>
      </div>

      {/* onIndexChange 를 주지 않아 표시 전용이다 — 점을 눌러 마지막 장으로 건너뛰면
          온보딩을 끝까지 보게 한다는 취지가 무너진다. 앞뒤 이동은 스와이프로만 한다. */}
      <CarouselIndicator count={SLIDES.length} activeIndex={activeIndex} className="mt-10" />
    </section>
  );
}
