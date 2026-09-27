import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OnboardingPage } from '@/features/onboarding/OnboardingPage';
import { shouldShowOnboarding } from '@/features/onboarding/onboardingSeen';

// 2장의 CTA 는 진짜 OS 공유 시트를 연다 — jsdom 에는 없으니 열림/닫힘 시점만 손에 쥔다.
const shareViaSystem = vi.hoisted(() => vi.fn<() => Promise<boolean>>());

vi.mock('@/features/share/lib/shareUrl', () => ({ shareViaSystem }));

// 3장은 Lottie 다. 전역 setup 이 플레이어를 null 로 바꿔 두므로, 이 장이 무엇을 띄웠는지만
// 보이게 접근성 이름을 흘려 주는 자리표시자로 바꾼다. JSON(1MB)은 읽을 필요가 없다.
vi.mock('@/shared/ui/lottie', () => ({
  Lottie: ({
    'aria-label': label,
    animationData,
  }: {
    'aria-label'?: string;
    animationData?: { nm?: string };
  }) => <div role="img" aria-label={label} data-lottie={animationData?.nm} />,
}));
vi.mock('@/assets/lottie/onboarding_guide_1.json', () => ({ default: { nm: 'slide-1' } }));
vi.mock('@/assets/lottie/onboarding_guide_2.json', () => ({ default: { nm: 'slide-2-ios' } }));
vi.mock('@/assets/lottie/onboarding_guide_2_android.json', () => ({
  default: { nm: 'slide-2-android' },
}));
vi.mock('@/assets/lottie/onboarding_guide_3.json', () => ({ default: { nm: 'slide-3' } }));

const postMessage = vi.fn();

/** 지금 장은 URL 이 갖는다(`?slide=`) — 그 값이 실제로 바뀌는지 보려고 위치를 흘려 둔다. */
function LocationProbe() {
  const location = useLocation();
  return <p data-testid="location">{`${location.pathname}${location.search}`}</p>;
}

/** `entry` 는 WebView 가 다시 로드될 때의 주소다 — 그 주소만으로 어느 장이 뜨는지가 정해진다. */
function renderPage(entry = '/onboarding') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route
          path="/onboarding"
          element={
            <>
              <OnboardingPage />
              <LocationProbe />
            </>
          }
        />
        <Route path="/map" element={<p>지도 화면</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

const currentLocation = () => screen.getByTestId('location').textContent;

/** 시트가 떠 있는 상태를 붙잡아 두고, 닫는 시점은 테스트가 정한다. */
function openShareSheet(buttonName = '설정하기') {
  let close: () => void = () => undefined;
  shareViaSystem.mockImplementation(
    () =>
      new Promise((resolve) => {
        close = () => resolve(true);
      }),
  );
  fireEvent.click(screen.getByRole('button', { name: buttonName }));
  return async () => {
    await act(async () => close());
    // 그림이 제자리로 돌아온 뒤(300ms)에 CTA 가 드러난다.
    await act(() => new Promise((resolve) => setTimeout(resolve, 300)));
  };
}

/** 지금 장의 문구 위에서 가로로 dx 만큼 쓸었다 뗀다. 축은 첫 움직임에서 정해진다. */
function swipeSlide(dx: number) {
  const target = screen.getByRole('heading', { level: 1 });
  const at = (clientX: number) => ({ clientX, clientY: 300 });
  fireEvent.touchStart(target, { touches: [at(200)] });
  fireEvent.touchMove(target, { touches: [at(200 + dx / 2)] });
  fireEvent.touchMove(target, { touches: [at(200 + dx)] });
  fireEvent.touchEnd(target, { changedTouches: [at(200 + dx)] });
}

/** 1장 → 2장 → 공유 시트를 열었다 닫고 → 다음 으로 3장까지 간다. */
async function goToLastSlide() {
  fireEvent.click(screen.getByRole('button', { name: '다음' }));
  const closeSheet = openShareSheet();
  await closeSheet();
  fireEvent.click(screen.getByRole('button', { name: '다음' }));
}

// 온보딩은 앱(WebView)에서만 뜬다 — 기록 여부 판정에 셸 여부가 함께 걸린다.
beforeEach(() => {
  Object.defineProperty(window, 'ReactNativeWebView', {
    configurable: true,
    value: { postMessage },
  });
  shareViaSystem.mockResolvedValue(true);
});

afterEach(() => {
  localStorage.clear();
  Reflect.deleteProperty(window, 'ReactNativeWebView');
  Reflect.deleteProperty(window, '__nookPlatform');
  shareViaSystem.mockReset();
  postMessage.mockReset();
});

describe('온보딩 화면', () => {
  it('1장의 문구와 모션을 보여준다 — 그림은 Lottie 다', async () => {
    renderPage();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('인스타그램 게시물로');
    expect(
      await screen.findByRole('img', { name: '앱을 열지 않고도 바로 저장할 수 있어요' }),
    ).toBeInTheDocument();
    // HTML 판(4.8MB)은 더 붙지 않는다.
    expect(screen.queryByTitle('앱을 열지 않고도 바로 저장할 수 있어요')).not.toBeInTheDocument();
  });

  it('다음을 누르면 2장 — 모션이 바뀌고 CTA 가 설정하기가 된다', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    // 2장에 오면 3장 Lottie 를 미리 받기 시작한다 — 그 import 가 끝나는 것까지 기다린다.
    await act(async () => {});

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('누크를 즐겨찾기하고');
    expect(
      screen.getByRole('img', { name: '이렇게 하면 저장이 2배 더 빨라져요!' }),
    ).toHaveAttribute('data-lottie', 'slide-2-ios');
    expect(screen.getByText('이 화면에서 바로 설정할 수 있어요!')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '다음' })).not.toBeInTheDocument();
  });

  it('설정하기는 OS 공유 시트를 먼저 열고, 시트가 올라올 때 모션을 함께 줄인다', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    await act(async () => {});

    openShareSheet();

    expect(shareViaSystem).toHaveBeenCalledWith({ title: 'nook', url: expect.any(String) });
    // 실기기에서 네이티브 공유 시트의 첫 상승 프레임까지 걸리는 시간 동안은 원래 크기를 유지한다.
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    await act(() => new Promise((resolve) => setTimeout(resolve, 300)));
    // 시트가 화면 아래를 덮으므로 문구·버튼은 걷고, 따라 볼 모션만 남긴다.
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '설정하기' })).not.toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: '이렇게 하면 저장이 2배 더 빨라져요!', hidden: true }),
    ).toBeInTheDocument();
  });

  it('시트를 닫으면 2장에 남아 다음·다시 설정하기가 뜨고, 다시 설정하기는 시트를 또 연다', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    await act(async () => {});
    await openShareSheet()();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('누크를 즐겨찾기하고');
    expect(screen.queryByRole('button', { name: '설정하기' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다음' })).toBeInTheDocument();

    const closeAgain = openShareSheet('다시 설정하기');
    expect(shareViaSystem).toHaveBeenCalledTimes(2);
    await closeAgain();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('누크를 즐겨찾기하고');
  });

  it('설정 후 다음을 누르면 3장 — Lottie 모션과 저장하러 가기 CTA 가 뜨고, 아직 기록하지 않는다', async () => {
    renderPage();

    await goToLastSlide();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('이제 바로 저장해볼까요?');
    expect(
      await screen.findByRole('img', { name: '인스타그램 게시물을 바로 누크에 저장할 수 있어요' }),
    ).toBeInTheDocument();
    expect(screen.getByText('인스타그램으로 이동해요!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '저장하러 가기' })).toBeInTheDocument();
    expect(shouldShowOnboarding()).toBe(true);
  });

  it('저장하러 가기는 셸에 인스타그램을 열게 하고 기록만 한다 — 화면은 3장에 그대로 남는다', async () => {
    renderPage();
    await goToLastSlide();

    fireEvent.click(screen.getByRole('button', { name: '저장하러 가기' }));

    // 셸은 이 주소를 Linking.openURL 로 연다 — 앱이 있으면 앱, 없으면 브라우저.
    expect(postMessage).toHaveBeenCalledWith(
      JSON.stringify({
        v: 1,
        type: 'OPEN_EXTERNAL_URL',
        payload: { url: 'https://www.instagram.com/p/DcTo_cCD-G8/?stkn=YWRzcjE2d3lrOGdi' },
      }),
    );
    expect(localStorage.getItem('onboarding_guide_seen')).toBe('true');
    expect(shouldShowOnboarding()).toBe(false);
    // 인스타그램에서 돌아오면 방금 보던 3장이다 — 지도로 넘기지 않는다.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('이제 바로 저장해볼까요?');
    expect(screen.queryByText('지도 화면')).not.toBeInTheDocument();
  });

  it('장을 넘기면 URL 에 남는다 — 다른 앱에 다녀와 화면이 다시 떠도 그 장으로 돌아올 근거다', async () => {
    renderPage();

    expect(currentLocation()).toBe('/onboarding');

    fireEvent.click(screen.getByRole('button', { name: '다음' }));

    expect(currentLocation()).toBe('/onboarding?slide=1');
    // 2장에 오면 3장 Lottie 를 미리 받기 시작한다 — 그 import 가 끝나는 것까지 기다린다.
    await act(async () => {});
  });

  it('다시 뜰 때 URL 의 장부터 보여준다 — 1·2·3장 어디서 이탈했든 그 장이다', async () => {
    const { unmount } = renderPage('/onboarding?slide=1');
    await act(async () => {});
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('누크를 즐겨찾기하고');
    // 2장의 안내(말풍선·설정하기)도 그대로다 — 공유 시트를 열기 전 상태로 돌아온다.
    expect(screen.getByRole('button', { name: '설정하기' })).toBeInTheDocument();

    unmount();
    renderPage('/onboarding?slide=2');
    await act(async () => {});

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('이제 바로 저장해볼까요?');
    expect(screen.getByRole('button', { name: '저장하러 가기' })).toBeInTheDocument();
  });

  it('URL 의 장 번호가 이상하면 있는 범위로 접는다', async () => {
    const { unmount } = renderPage('/onboarding?slide=99');
    await act(async () => {});
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('이제 바로 저장해볼까요?');

    unmount();
    renderPage('/onboarding?slide=abc');

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('인스타그램 게시물로');
  });

  it('좌우로 쓸면 장만 넘어간다 — 2장에서 밀어도 공유 시트 없이 바로 3장이다', async () => {
    renderPage();

    swipeSlide(-120);
    await act(async () => {});
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('누크를 즐겨찾기하고');

    swipeSlide(-120);
    await act(async () => {});
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('이제 바로 저장해볼까요?');
    expect(shareViaSystem).not.toHaveBeenCalled();

    // 마지막 장에서 더 밀어도 끝내지 않는다.
    swipeSlide(-120);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('이제 바로 저장해볼까요?');
    expect(localStorage.getItem('onboarding_guide_seen')).toBeNull();

    swipeSlide(120);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('누크를 즐겨찾기하고');
  });

  // 2장은 iOS 공유 시트를 그린 그림이라 Android 에서는 디자이너가 따로 그린 판을 쓴다.
  // 어느 판을 쓸지는 셸이 로드 전에 심어 준 platform 으로 모듈을 읽는 시점에 정해지므로,
  // 그 값을 먼저 심고 모듈을 다시 읽어야 한다.
  it('Android 셸에서는 2장 그림이 Android 판 Lottie 다', async () => {
    Object.defineProperty(window, '__nookPlatform', { configurable: true, value: 'android' });
    vi.resetModules();
    const { OnboardingPage: AndroidOnboardingPage } = await import(
      '@/features/onboarding/OnboardingPage'
    );

    render(
      <MemoryRouter initialEntries={['/onboarding?slide=1']}>
        <AndroidOnboardingPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('누크를 즐겨찾기하고');
    // iOS 판(228KB)이 아니라 Android 판(1.25MB)을 받는다 — 시트 모양이 아예 다르다.
    expect(
      await screen.findByRole('img', { name: '이렇게 하면 저장이 2배 더 빨라져요!' }),
    ).toHaveAttribute('data-lottie', 'slide-2-android');
    // 1장은 어느 OS 에서나 Lottie 다(지금은 화면 밖 장이라 낭독에서 빠져 있다).
    expect(
      await screen.findByRole('img', {
        name: '앱을 열지 않고도 바로 저장할 수 있어요',
        hidden: true,
      }),
    ).toBeInTheDocument();
  });

  it('닫기도 기록한다 — 그만 보겠다는 선택이라 다음 진입에 다시 띄우지 않는다', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: '온보딩 닫기' }));

    expect(await screen.findByText('지도 화면')).toBeInTheDocument();
    expect(localStorage.getItem('onboarding_guide_seen')).toBe('true');
    expect(shouldShowOnboarding()).toBe(false);
  });
});
