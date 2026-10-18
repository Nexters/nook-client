import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BuildInfoLine } from '@/features/my/components/BuildInfoLine';
import { ToastProvider } from '@/shared/toast';

const mocks = vi.hoisted(() => ({ appVersion: null as string | null }));

vi.mock('@/native-bridge', () => ({
  nativeBridge: {
    get appVersion() {
      return mocks.appVersion;
    },
  },
}));

const WEB_BUILD = /\d{4}\.\d{2}\.\d{2} · (dev|[0-9a-f]{7})/;

function renderLine() {
  render(
    <ToastProvider>
      <BuildInfoLine />
    </ToastProvider>,
  );
  return screen.getByText(WEB_BUILD);
}

function press(element: HTMLElement, durationMs: number) {
  const now = vi.spyOn(Date, 'now').mockReturnValue(1_000);
  fireEvent.pointerDown(element);
  now.mockReturnValue(1_000 + durationMs);
  fireEvent.pointerUp(element);
  now.mockRestore();
}

describe('BuildInfoLine', () => {
  afterEach(() => {
    mocks.appVersion = null;
    vi.unstubAllGlobals();
  });

  it('앱 버전 · 웹 빌드 날짜 · 커밋을 한 줄로 보여준다', () => {
    mocks.appVersion = '1.1.1';

    expect(renderLine().textContent).toMatch(new RegExp(`^1\\.1\\.1 · ${WEB_BUILD.source}$`));
  });

  it('셸 밖에서는 앱 버전 없이 웹 빌드 정보만 보여준다', () => {
    expect(renderLine().textContent).toMatch(new RegExp(`^${WEB_BUILD.source}$`));
  });

  it('길게 누르면 그 줄을 그대로 복사한다', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    const line = renderLine();

    press(line, 600);

    expect(writeText).toHaveBeenCalledWith(line.textContent);
    expect(await screen.findByText('클립보드에 복사되었습니다.')).toBeInTheDocument();
  });

  it('짧게 누르면 복사하지 않는다', () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });

    press(renderLine(), 100);

    expect(writeText).not.toHaveBeenCalled();
  });
});
