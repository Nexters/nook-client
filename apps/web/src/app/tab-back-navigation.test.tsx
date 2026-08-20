import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { MainTabPageLayout } from '@/app/layouts/MainTabPageLayout';
import { bottomMenuItems } from '@/app/navigation';
import { runBackInterceptors } from '@/shared/lib/backInterceptors';
import { BottomMenu } from '@/shared/ui';

/**
 * iOS 엣지 스와이프는 WKWebView 가 히스토리를 직접 pop 하므로 웹에서 가로챌 수 없다.
 * 대신 탭 루트를 늘 스택 맨 아래에 두어 "돌아갈 엔트리 자체가 없게" 만든다 —
 * 그러면 제스처가 인식조차 되지 않는다. 여기서는 그 전제(탭 이동이 히스토리를 쌓지
 * 않는다)와, 그 때문에 필요해진 Android 백 인터셉터를 검증한다.
 */

function LocationProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output data-testid="path">{location.pathname}</output>
      <button type="button" onClick={() => navigate(-1)}>
        히스토리 뒤로
      </button>
    </>
  );
}

function renderTabs(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <LocationProbe />
      <BottomMenu items={bottomMenuItems} />
    </MemoryRouter>,
  );
}

const path = () => screen.getByTestId('path').textContent;

describe('탭 이동은 히스토리를 쌓지 않는다', () => {
  it('탭을 옮긴 뒤 히스토리 뒤로를 해도 이전 탭으로 돌아가지 않는다', () => {
    renderTabs('/map');

    fireEvent.click(screen.getByRole('link', { name: /archive/ }));
    expect(path()).toBe('/archive');

    // 스택이 [archive] 한 칸뿐이라 돌아갈 곳이 없다 = iOS 스와이프도 무반응이다.
    fireEvent.click(screen.getByRole('button', { name: '히스토리 뒤로' }));
    expect(path()).toBe('/archive');
  });

  it('탭을 여러 번 옮겨도 스택은 자라지 않는다', () => {
    renderTabs('/map');

    fireEvent.click(screen.getByRole('link', { name: /archive/ }));
    fireEvent.click(screen.getByRole('link', { name: /my/ }));
    expect(path()).toBe('/my');

    fireEvent.click(screen.getByRole('button', { name: '히스토리 뒤로' }));
    expect(path()).toBe('/my');
  });
});

describe('탭 루트의 Android 백 인터셉터', () => {
  function renderTabPage(initialPath: string) {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <LocationProbe />
        <Routes>
          <Route
            path="/archive"
            element={
              <MainTabPageLayout>
                <p>아카이브</p>
              </MainTabPageLayout>
            }
          />
          <Route
            path="/my"
            element={
              <MainTabPageLayout>
                <p>마이</p>
              </MainTabPageLayout>
            }
          />
          <Route
            path="/map"
            element={
              <MainTabPageLayout variant="transparent">
                <p>지도</p>
              </MainTabPageLayout>
            }
          />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('홈이 아닌 탭에서는 백을 가로채 홈 탭으로 보낸다', () => {
    renderTabPage('/archive');

    let handled = false;
    act(() => {
      handled = runBackInterceptors();
    });

    expect(handled).toBe(true);
    expect(path()).toBe('/map');
  });

  it('홈 탭에서는 가로채지 않는다 — 그대로 흘려보내야 셸이 앱을 내린다', () => {
    renderTabPage('/map');

    let handled = true;
    act(() => {
      handled = runBackInterceptors();
    });

    expect(handled).toBe(false);
    expect(path()).toBe('/map');
  });

  it('홈으로 보낼 때도 히스토리를 쌓지 않는다 — 홈에서 다시 백을 누르면 앱이 내려가야 한다', () => {
    renderTabPage('/my');

    act(() => {
      runBackInterceptors();
    });
    expect(path()).toBe('/map');

    let handled = true;
    act(() => {
      handled = runBackInterceptors();
    });
    expect(handled).toBe(false);
  });
});
