import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppVersionPolicy } from './api';

const mocks = vi.hoisted(() => ({
  isNative: true,
  appBuildNumber: '42' as string | null,
  send: vi.fn(),
  fetchAppVersionPolicy: vi.fn<() => Promise<AppVersionPolicy>>(),
}));

vi.mock('@/native-bridge', () => ({
  nativeBridge: {
    get isNative() {
      return mocks.isNative;
    },
    get appBuildNumber() {
      return mocks.appBuildNumber;
    },
    platform: 'ios',
    appVersion: '1.1.1',
    send: mocks.send,
  },
}));

vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api')>()),
  fetchAppVersionPolicy: mocks.fetchAppVersionPolicy,
}));

import { AppUpdateGateHost } from './AppUpdateGateHost';

const STORE_URL = 'https://apps.apple.com/app/id123';

function policy(overrides: Partial<AppVersionPolicy>): AppVersionPolicy {
  return {
    updateType: 'NONE',
    latestBuildNumber: 57,
    latestVersion: '1.2.0',
    storeUrl: STORE_URL,
    ...overrides,
  };
}

function renderHost() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AppUpdateGateHost />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mocks.isNative = true;
  mocks.appBuildNumber = '42';
  mocks.send.mockReset();
  mocks.fetchAppVersionPolicy.mockReset();
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
});

describe('AppUpdateGateHost — 호출 조건', () => {
  it('브라우저에서는 정책을 조회하지 않는다', () => {
    mocks.isNative = false;
    renderHost();
    expect(mocks.fetchAppVersionPolicy).not.toHaveBeenCalled();
  });

  it('빌드 번호를 모르는 구버전 셸에서는 조회하지 않는다', () => {
    mocks.appBuildNumber = null;
    renderHost();
    expect(mocks.fetchAppVersionPolicy).not.toHaveBeenCalled();
  });

  it('NONE 이면 아무것도 그리지 않는다', async () => {
    mocks.fetchAppVersionPolicy.mockResolvedValue(policy({ updateType: 'NONE' }));
    renderHost();
    await waitFor(() => expect(mocks.fetchAppVersionPolicy).toHaveBeenCalledOnce());
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('조회에 실패하면 앱을 막지 않는다', async () => {
    mocks.fetchAppVersionPolicy.mockRejectedValue(new Error('network'));
    renderHost();
    await waitFor(() => expect(mocks.fetchAppVersionPolicy).toHaveBeenCalledOnce());
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});

describe('AppUpdateGateHost — 강제 업데이트', () => {
  it('닫을 수 없는 단일 버튼 팝업을 띄우고, 버튼은 스토어를 연다', async () => {
    mocks.fetchAppVersionPolicy.mockResolvedValue(policy({ updateType: 'FORCE' }));
    renderHost();

    await screen.findByText('업데이트가 필요해요');
    expect(screen.getAllByRole('button')).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: '업데이트하기' }));

    expect(mocks.send).toHaveBeenCalledWith({
      v: 1,
      type: 'OPEN_EXTERNAL_URL',
      payload: { url: STORE_URL },
    });
    // 스토어에서 돌아와도 여전히 막혀 있어야 한다.
    expect(screen.getByText('업데이트가 필요해요')).toBeInTheDocument();
  });
});

describe('AppUpdateGateHost — 권장 업데이트', () => {
  it('두 버튼 팝업을 띄우고, "나중에"를 누르면 닫히며 그 빌드는 기억한다', async () => {
    mocks.fetchAppVersionPolicy.mockResolvedValue(policy({ updateType: 'RECOMMEND' }));
    const { unmount } = renderHost();

    await screen.findByText('새로운 버전이 나왔어요');
    fireEvent.click(screen.getByRole('button', { name: '나중에' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    unmount();

    // 같은 빌드가 최신인 동안은 다시 묻지 않는다.
    renderHost();
    await waitFor(() => expect(mocks.fetchAppVersionPolicy).toHaveBeenCalledTimes(2));
    expect(screen.queryByText('새로운 버전이 나왔어요')).not.toBeInTheDocument();
  });

  it('더 새로운 빌드가 나오면 다시 묻는다', async () => {
    mocks.fetchAppVersionPolicy.mockResolvedValue(
      policy({ updateType: 'RECOMMEND', latestBuildNumber: 57 }),
    );
    const { unmount } = renderHost();
    await screen.findByText('새로운 버전이 나왔어요');
    fireEvent.click(screen.getByRole('button', { name: '나중에' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    unmount();

    mocks.fetchAppVersionPolicy.mockResolvedValue(
      policy({ updateType: 'RECOMMEND', latestBuildNumber: 58 }),
    );
    renderHost();

    await screen.findByText('새로운 버전이 나왔어요');
  });

  it('"업데이트하기"는 스토어를 열고 팝업을 닫는다', async () => {
    mocks.fetchAppVersionPolicy.mockResolvedValue(policy({ updateType: 'RECOMMEND' }));
    renderHost();

    await screen.findByText('새로운 버전이 나왔어요');
    fireEvent.click(screen.getByRole('button', { name: '업데이트하기' }));

    expect(mocks.send).toHaveBeenCalledWith({
      v: 1,
      type: 'OPEN_EXTERNAL_URL',
      payload: { url: STORE_URL },
    });
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });
});
