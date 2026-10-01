import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHideBottomMenu } from '@/app/bottom-menu-visibility';
import { SlideScreen, useSlideScreen } from '@/app/slide-screen';
import step1 from '@/assets/images/save-guide/step-1.png';
import step2 from '@/assets/images/save-guide/step-2.png';
import step3 from '@/assets/images/save-guide/step-3.png';
import { shareViaSystem } from '@/features/share/lib/shareUrl';
import { env } from '@/shared/config/env';
import { BackButton, Button, Header } from '@/shared/ui';

/** 무엇을 공유하든 상관없다 — 시트를 띄우는 것 자체가 목적이다(온보딩 2장과 같다). */
const SHARE_TARGET = { title: 'nook', url: env.webOrigin };

/**
 * 단계별 캡처. 강조 테두리는 1·2단계만 코드로 얹는다(3단계는 그림에 들어 있다).
 * 좁은 기기에서 그림이 줄어도 테두리가 따라가게 위치는 그림 대비 % 로 둔다 — 시안 px 를 그림 크기로 나눈 값.
 */
const STEPS = [
  {
    lead: '바텀 시트에서 앱 목록 ',
    strong: '맨 우측 더보기',
    tail: '를 눌러주세요.',
    image: step1,
    width: 280,
    highlight: { left: '77.14%', top: '6.9%', width: '22.86%', height: '80.46%' },
  },
  {
    lead: '우측 상단의 ',
    strong: '편집',
    tail: '을 눌러주세요.',
    image: step2,
    width: 280,
    highlight: { left: '84.1%', top: '0', width: '15.7%', height: '80.16%' },
  },
  {
    lead: '제안에서 Nook를 찾아 ',
    strong: '+를 눌러주세요.',
    tail: '',
    image: step3,
    width: 300,
  },
];

/**
 * Figma `마이페이지 > 더 편하게 저장하는 방법`. iOS 전용 — 공유 시트 즐겨찾기 안내라
 * Android 는 시트 모양이 달라 진입점부터 숨긴다(`MyPage`).
 */
export function SaveGuidePage() {
  useHideBottomMenu();
  const navigate = useNavigate();
  const { slidIn, slideOut } = useSlideScreen({
    close: useCallback(() => navigate(-1), [navigate]),
  });
  const [sharing, setSharing] = useState(false);

  const openShareSheet = async () => {
    setSharing(true);
    await shareViaSystem(SHARE_TARGET);
    setSharing(false);
  };

  return (
    <SlideScreen slidIn={slidIn} style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <Header title="더 편하게 저장하는 방법" left={<BackButton onClick={slideOut} />} />

      <ol className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain px-4 pt-3">
        {STEPS.map((step, index) => (
          <li
            key={step.image}
            className="flex flex-col items-center gap-5 rounded-sm bg-gray-10 px-5 pt-5 pb-6"
          >
            <p className="flex w-full items-center gap-1.5 text-b2 font-semibold text-gray-90">
              <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-gray-90 text-s1 text-gray-0">
                {index + 1}
              </span>
              <span>
                {step.lead}
                <strong className="font-extrabold">{step.strong}</strong>
                {step.tail}
              </span>
            </p>
            <div className="relative max-w-full" style={{ width: step.width }}>
              <img src={step.image} alt="" className="block h-auto w-full" />
              {step.highlight ? (
                <span
                  aria-hidden="true"
                  className="absolute border-2 border-gray-100"
                  style={step.highlight}
                />
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      <div
        className="flex flex-col items-center px-4 pt-4"
        style={{ paddingBottom: 'max(1rem, calc(0.5rem + env(safe-area-inset-bottom)))' }}
      >
        <p className="rounded-[20px] bg-gray-80 px-3.5 py-1.5 text-b3 font-semibold text-gray-0">
          이 화면에서 바로 설정할 수 있어요!
        </p>
        <span aria-hidden="true" className="-mt-1 mb-2 size-2 rotate-45 bg-gray-80" />
        <Button size="lg" fullWidth disabled={sharing} onClick={() => void openShareSheet()}>
          설정하러 가기
        </Button>
      </div>
    </SlideScreen>
  );
}
