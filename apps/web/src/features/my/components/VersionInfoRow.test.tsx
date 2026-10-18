import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VersionInfoRow } from '@/features/my/components/VersionInfoRow';
import { ToastProvider } from '@/shared/toast';

const mocks = vi.hoisted(() => ({ appVersion: null as string | null }));

vi.mock('@/native-bridge', () => ({
  nativeBridge: {
    get appVersion() {
      return mocks.appVersion;
    },
  },
}));

const WEB_BUILD = '\\d{8}-(dev|[0-9a-f]{7})';
const APP_BUILD_ID = new RegExp(`^v1\\.1\\.1-${WEB_BUILD}$`);
const WEB_BUILD_ID = new RegExp(`^web-${WEB_BUILD}$`);

function renderRow() {
  render(
    <ToastProvider>
      <VersionInfoRow />
    </ToastProvider>,
  );
}

function longPress(element: HTMLElement, durationMs: number) {
  const now = vi.spyOn(Date, 'now').mockReturnValue(1_000);
  fireEvent.pointerDown(element);
  now.mockReturnValue(1_000 + durationMs);
  fireEvent.pointerUp(element);
  now.mockRestore();
}

function stubClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
  return writeText;
}

describe('VersionInfoRow', () => {
  afterEach(() => {
    mocks.appVersion = null;
    vi.unstubAllGlobals();
  });

  it('라벨 아래에 앱 버전·빌드 날짜·커밋을 이은 빌드 ID 를, 오른쪽에 앱 버전을 보여준다', () => {
    mocks.appVersion = '1.1.1';
    renderRow();

    expect(screen.getByText(APP_BUILD_ID)).toBeInTheDocument();
    expect(screen.getByText('v1.1.1')).toBeInTheDocument();
  });

  it('셸 밖에서는 빌드 ID 가 web- 으로 시작한다', () => {
    renderRow();

    expect(screen.getByText(WEB_BUILD_ID)).toBeInTheDocument();
  });

  it('길게 누르면 보이는 빌드 ID 를 그대로 복사한다', async () => {
    mocks.appVersion = '1.1.1';
    const writeText = stubClipboard();
    renderRow();

    longPress(screen.getByText('버전 정보'), 600);

    expect(writeText).toHaveBeenCalledWith(expect.stringMatching(APP_BUILD_ID));
    expect(await screen.findByText('클립보드에 복사되었습니다.')).toBeInTheDocument();
  });

  it('셸 밖에서는 web- 빌드 ID 를 복사한다', () => {
    const writeText = stubClipboard();
    renderRow();

    longPress(screen.getByText('버전 정보'), 600);

    expect(writeText).toHaveBeenCalledWith(expect.stringMatching(WEB_BUILD_ID));
  });

  it('짧게 누르면 복사하지 않는다', () => {
    const writeText = stubClipboard();
    renderRow();

    longPress(screen.getByText('버전 정보'), 100);

    expect(writeText).not.toHaveBeenCalled();
  });
});
