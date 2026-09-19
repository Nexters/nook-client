import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OnboardingPage } from '@/features/onboarding/OnboardingPage';
import { shouldShowOnboarding } from '@/features/onboarding/onboardingSeen';

// 2장의 CTA 는 진짜 OS 공유 시트를 연다 — jsdom 에는 없으니 열림/닫힘 시점만 손에 쥔다.
const shareViaSystem = vi.hoisted(() => vi.fn<() => Promise<boolean>>());

vi.mock('@/features/share/lib/shareUrl', () => ({ shareViaSystem }));

// 3장은 Lottie 다. 전역 setup 이 플레이어를 null 로 바꿔 두므로, 이 장이 무엇을 띄웠는지만
// 보이게 접근성 이름을 흘려 주는 자리표시자로 바꾼다. JSON(1MB)은 읽을 필요가 없다.
vi.mock('@/shared/ui/lottie', () => ({
  Lottie: ({ 'aria-label': label }: { 'aria-label'?: string }) => (
    <div role="img" aria-label={label} />
  ),
}));
vi.mock('@/assets/lottie/onboarding_guide_3.json', () => ({ default: {} }));

const postMessage = vi.fn();

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/onboarding']}>
      <Routes>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/map" element={<p>지도 화면</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

/** 시트가 떠 있는 상태를 붙잡아 두고, 닫는 시점은 테스트가 정한다. */
function openShareSheet() {
  let close: () => void = () => undefined;
  shareViaSystem.mockImplementation(
    () =>
      new Promise((resolve) => {
        close = () => resolve(true);
      }),
  );
  fireEvent.click(screen.getByRole('button', { name: '설정하기' }));
  return async () => {
    await act(async () => close());
    // 그림이 제자리로 돌아온 뒤(300ms)에 다음 장으로 넘어간다.
    await act(() => new Promise((resolve) => setTimeout(resolve, 300)));
  };
}

/** 1장 → 2장 → 공유 시트를 열었다 닫아 3장까지 간다. */
async function goToLastSlide() {
  fireEvent.click(screen.getByRole('button', { name: '다음' }));
  const closeSheet = openShareSheet();
  await closeSheet();
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
  shareViaSystem.mockReset();
  postMessage.mockReset();
});

describe('온보딩 화면', () => {
  it('1장의 문구와 모션을 보여준다', () => {
    renderPage();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('인스타그램 게시물로');
    expect(screen.getByTitle('앱을 열지 않고도 바로 저장할 수 있어요').getAttribute('src')).toBe(
      '/onboarding/tutorial-1.html',
    );
  });

  it('다음을 누르면 2장 — 모션이 바뀌고 CTA 가 설정하기가 된다', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    // 2장에 오면 3장 Lottie 를 미리 받기 시작한다 — 그 import 가 끝나는 것까지 기다린다.
    await act(async () => {});

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('누크를 즐겨찾기하고');
    expect(screen.getByTitle('이렇게 하면 저장이 2배 더 빨라져요!').getAttribute('src')).toBe(
      '/onboarding/tutorial-2.html',
    );
    expect(screen.getByText('이 화면에서 바로 설정할 수 있어요!')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '다음' })).not.toBeInTheDocument();
  });

  it('설정하기는 OS 공유 시트를 열고, 그동안 모션만 남긴다', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    await act(async () => {});

    openShareSheet();

    expect(shareViaSystem).toHaveBeenCalledWith({ title: 'nook', url: expect.any(String) });
    // 시트가 화면 아래를 덮으므로 문구·버튼은 걷고, 따라 볼 모션만 남긴다.
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '설정하기' })).not.toBeInTheDocument();
    expect(screen.getByTitle('이렇게 하면 저장이 2배 더 빨라져요!')).toBeInTheDocument();
  });

  it('시트를 닫으면 3장 — Lottie 모션과 저장하러 가기 CTA 가 뜨고, 아직 기록하지 않는다', async () => {
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

  it('저장하러 가기는 셸에 누크 인스타그램 계정을 열게 하고, 기록한 뒤 지도로 나간다', async () => {
    renderPage();
    await goToLastSlide();

    fireEvent.click(screen.getByRole('button', { name: '저장하러 가기' }));

    // 셸은 이 주소를 Linking.openURL 로 연다 — 앱이 있으면 앱, 없으면 브라우저.
    expect(postMessage).toHaveBeenCalledWith(
      JSON.stringify({
        v: 1,
        type: 'OPEN_EXTERNAL_URL',
        payload: { url: 'https://www.instagram.com/nook.archiving?stkn=NTl6bTd6MW9kOXBu' },
      }),
    );
    expect(await screen.findByText('지도 화면')).toBeInTheDocument();
    expect(localStorage.getItem('onboarding_guide_seen')).toBe('true');
    expect(shouldShowOnboarding()).toBe(false);
  });

  it('닫기도 기록한다 — 그만 보겠다는 선택이라 다음 진입에 다시 띄우지 않는다', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: '온보딩 닫기' }));

    expect(await screen.findByText('지도 화면')).toBeInTheDocument();
    expect(localStorage.getItem('onboarding_guide_seen')).toBe('true');
    expect(shouldShowOnboarding()).toBe(false);
  });
});
