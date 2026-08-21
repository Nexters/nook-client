import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requestPushStatus: vi.fn(),
  requestPushPermission: vi.fn(),
  registerPushToken: vi.fn(),
}));

vi.mock('@/native-bridge', () => ({
  nativeBridge: {
    isNative: true,
    requestPushStatus: mocks.requestPushStatus,
    requestPushPermission: mocks.requestPushPermission,
  },
}));

vi.mock('@/features/notifications/api/pushTokens', () => ({
  registerPushToken: mocks.registerPushToken,
}));

// "나중에" 기억이 모듈 스코프라, 테스트끼리 공유하지 않게 매번 새로 불러온다.
async function renderSheet(active = true) {
  const { PushPrimingSheet } = await import('./PushPrimingSheet');
  render(<PushPrimingSheet active={active} />);
}

describe('PushPrimingSheet', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.requestPushStatus.mockResolvedValue({ requestId: 'r', status: 'undetermined' });
    mocks.requestPushPermission.mockResolvedValue({ requestId: 'r', status: 'granted' });
    mocks.registerPushToken.mockResolvedValue(undefined);
  });

  it('처리 중 진입 & 권한 미결정이면 시트가 뜬다', async () => {
    await renderSheet();
    expect(await screen.findByText('저장이 끝나면 알려드릴까요?')).toBeInTheDocument();
  });

  it('이미 허용/거부된 상태면 뜨지 않는다', async () => {
    mocks.requestPushStatus.mockResolvedValue({ requestId: 'r', status: 'granted' });
    await renderSheet();
    await waitFor(() => expect(mocks.requestPushStatus).toHaveBeenCalled());
    expect(screen.queryByText('저장이 끝나면 알려드릴까요?')).not.toBeInTheDocument();
  });

  it('처리 중이 아니면 상태 조회조차 하지 않는다', async () => {
    await renderSheet(false);
    expect(mocks.requestPushStatus).not.toHaveBeenCalled();
  });

  it('알림 받기를 누르면 OS 권한을 요청하고, 받은 토큰을 서버에 등록한다', async () => {
    mocks.requestPushPermission.mockResolvedValue({
      requestId: 'r',
      status: 'granted',
      token: { platform: 'ios', value: 'tok' },
    });
    await renderSheet();

    fireEvent.click(await screen.findByRole('button', { name: '알림 받기' }));

    await waitFor(() => expect(mocks.requestPushPermission).toHaveBeenCalled());
    await waitFor(() =>
      expect(mocks.registerPushToken).toHaveBeenCalledWith({ platform: 'ios', value: 'tok' }),
    );
  });

  it('나중에를 누르면 닫히고 같은 세션에서 다시 뜨지 않는다', async () => {
    const { PushPrimingSheet } = await import('./PushPrimingSheet');
    const { unmount } = render(<PushPrimingSheet active />);
    fireEvent.click(await screen.findByRole('button', { name: '나중에' }));
    await waitFor(() =>
      expect(screen.queryByText('저장이 끝나면 알려드릴까요?')).not.toBeInTheDocument(),
    );
    unmount();

    // 같은 모듈 인스턴스로 다시 마운트 — 상태 조회 없이 조용해야 한다.
    mocks.requestPushStatus.mockClear();
    render(<PushPrimingSheet active />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mocks.requestPushStatus).not.toHaveBeenCalled();
  });
});
