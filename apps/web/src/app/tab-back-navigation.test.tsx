import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MainTabPageLayout, markTabRootNavigation } from '@/app/layouts/MainTabPageLayout';
import { bottomMenuItems } from '@/app/navigation';
import { nativeBridge } from '@/native-bridge';
import { runBackInterceptors } from '@/shared/lib/backInterceptors';
import { BottomMenu } from '@/shared/ui';

/**
 * 탭 이동은 push 다. iOS 엣지 스와이프로 막 돌아온 엔트리를 replace 하면 WKWebView 의
 * 뒤로가기 목록엔 옛 URL 이 남아, 다음 스와이프가 교체 전 화면으로 떨어진다(QA —
 * 아카이브 목록 → my → 약관 → 스와이프 = 아카이브 목록). 탭 화면의 스와이프는 셸의
 * 제스처 스위치가 막는다(`shared/lib/backGesture` 테스트 참고). 여기서는 push 전제와,
 * 그 때문에 탭 루트 아래에도 엔트리가 생겨 필요해진 Android 백 처리를 검증한다.
 */

afterEach(() => {
  vi.restoreAllMocks();
});

function LocationProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output data-testid="path">{location.pathname + location.search}</output>
      <button type="button" onClick={() => navigate(-1)}>
        히스토리 뒤로
      </button>
      <button type="button" onClick={() => navigate('/map?placeId=1')}>
        장소 상세 열기
      </button>
    </>
  );
}

function renderTabs(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <LocationProbe />
      <Routes>
        {['/archive', '/my', '/map'].map((path) => (
          <Route
            key={path}
            path={path}
            element={
              <MainTabPageLayout variant={path === '/map' ? 'transparent' : 'gray'}>
                <p>{path}</p>
              </MainTabPageLayout>
            }
          />
        ))}
      </Routes>
      <BottomMenu items={bottomMenuItems} onNavigate={markTabRootNavigation} />
    </MemoryRouter>,
  );
}

const path = () => screen.getByTestId('path').textContent;
const tab = (name: RegExp) => fireEvent.click(screen.getByRole('link', { name }));

function pressAndroidBack() {
  let handled = false;
  act(() => {
    handled = runBackInterceptors();
  });
  return handled;
}

describe('탭 이동은 엔트리를 덮어쓰지 않고 쌓는다', () => {
  it('탭을 옮기면 새 엔트리가 생겨, 히스토리 뒤로가 이전 탭을 가리킨다', () => {
    renderTabs('/archive');

    tab(/my/);
    expect(path()).toBe('/my');

    // 덮어썼다면 /archive 엔트리가 사라져 있어야 한다 — 남아 있다 = replace 가 없다.
    fireEvent.click(screen.getByRole('button', { name: '히스토리 뒤로' }));
    expect(path()).toBe('/archive');
  });
});

describe('탭 루트의 Android 백', () => {
  it('홈이 아닌 탭에서는 가로채 홈 탭으로 보낸다', () => {
    renderTabs('/archive');

    expect(pressAndroidBack()).toBe(true);
    expect(path()).toBe('/map');
  });

  it('탭으로 도착한 홈 루트에서는 아래 엔트리로 내려가지 않고 앱을 내린다', () => {
    const send = vi.spyOn(nativeBridge, 'send');
    renderTabs('/archive');
    tab(/map/);

    expect(pressAndroidBack()).toBe(true);
    expect(path()).toBe('/map');
    expect(send).toHaveBeenCalledWith({ v: 1, type: 'BACK_EXHAUSTED', payload: {} });
  });

  it('홈으로 보낸 뒤 다시 백을 누르면 앱이 내려간다', () => {
    const send = vi.spyOn(nativeBridge, 'send');
    renderTabs('/my');

    pressAndroidBack();
    expect(path()).toBe('/map');

    expect(pressAndroidBack()).toBe(true);
    expect(send).toHaveBeenCalledWith({ v: 1, type: 'BACK_EXHAUSTED', payload: {} });
  });

  it('홈 위에 push 된 장소 상세는 가로채지 않는다 — 히스토리 뒤로 닫혀야 한다', () => {
    const send = vi.spyOn(nativeBridge, 'send');
    renderTabs('/archive');
    tab(/map/);
    fireEvent.click(screen.getByRole('button', { name: '장소 상세 열기' }));

    expect(pressAndroidBack()).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });

  it('탭을 거치지 않은 첫 진입의 홈은 가로채지 않는다 — 기존 흐름(히스토리 뒤로/없으면 종료)을 탄다', () => {
    renderTabs('/map');

    expect(pressAndroidBack()).toBe(false);
    expect(path()).toBe('/map');
  });
});
