import { type ComponentType, useRef, useState } from 'react';
import { CarouselIndicator } from '@/shared/ui/carousel-indicator';
import {
  ImportPlacesIllustration,
  type OnboardingIllustrationProps,
  OrganizePlacesIllustration,
  SharePlacesIllustration,
} from './OnboardingIllustrations';

const slides: ReadonlyArray<{
  label: string;
  Illustration: ComponentType<OnboardingIllustrationProps>;
}> = [
  {
    label: '마음에 드는 장소를 발견했다면 공유하기로 저장해보세요',
    Illustration: ImportPlacesIllustration,
  },
  {
    label: '게시물을 저장하고 나만의 취향 지도를 만들어요',
    Illustration: OrganizePlacesIllustration,
  },
  {
    label: '그룹별로 장소를 모아 언제든 쉽게 찾아볼 수 있어요',
    Illustration: SharePlacesIllustration,
  },
] as const;

const SWIPE_THRESHOLD = 36;

export function OnboardingCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const pointerStartX = useRef<number | null>(null);

  const showPrevious = () => setActiveIndex((current) => Math.max(0, current - 1));
  const showNext = () => setActiveIndex((current) => Math.min(slides.length - 1, current + 1));

  return (
    <section
      aria-roledescription="carousel"
      aria-label="누크 서비스 소개"
      className="h-full w-full touch-pan-y"
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
      <div className="h-[calc(100%-18px)] overflow-hidden rounded-[28px]">
        <div
          className="flex h-full transition-transform duration-300 ease-out motion-reduce:transition-none"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {slides.map(({ label, Illustration }, index) => (
            <div key={label} aria-hidden={index !== activeIndex} className="h-full w-full shrink-0">
              <Illustration active={index === activeIndex} />
            </div>
          ))}
        </div>
      </div>

      <CarouselIndicator
        count={slides.length}
        activeIndex={activeIndex}
        size="md"
        onIndexChange={setActiveIndex}
        getItemLabel={(index) => `${index + 1}번째 온보딩 보기`}
        className="mt-6 h-1.5"
        aria-label="온보딩 페이지 선택"
      />
    </section>
  );
}
