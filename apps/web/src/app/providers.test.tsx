import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppProviders, useAppOverlayContainer } from '@/app/providers';

function Probe() {
  const container = useAppOverlayContainer();
  return (
    <div
      data-testid="probe"
      data-class={container?.className ?? ''}
      data-is-shell={String(container?.classList.contains('min-h-dvh') ?? false)}
    />
  );
}

describe('AppProviders 오버레이 컨테이너', () => {
  /**
   * vaul 은 이 컨테이너를 재서 스냅 높이를 잡는다 — 콘텐츠만큼 늘어나는 셸(min-h-dvh)을
   * 내주면 긴 목록에서 지도로 넘어올 때 시트가 그 페이지 높이 기준으로 스냅을 잡아
   * 화면 아래로 주차된다. 높이는 언제나 뷰포트여야 한다.
   */
  it('셸이 아니라 높이가 뷰포트로 고정된 빈 호스트를 내준다', () => {
    render(
      <AppProviders>
        <Probe />
      </AppProviders>,
    );

    const probe = screen.getByTestId('probe');
    expect(probe.dataset.isShell).toBe('false');
    expect(probe.dataset.class).toContain('h-dvh');
    expect(probe.dataset.class).not.toContain('min-h-dvh');
  });
});
