import type { PushToken } from '@nook/bridge-contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  register: vi.fn(),
  _delete: vi.fn(),
}));

vi.mock('@/shared/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api')>()),
  register: mocks.register,
  _delete: mocks._delete,
}));

const IOS_TOKEN: PushToken = { platform: 'ios', value: 'apns-token' };

function unitResponse() {
  return { resultType: 'SUCCESS' as const, success: null };
}

// 마지막 등록 토큰을 모듈 스코프에 기억해 두는 구현이라, 테스트끼리 그 상태를 공유하지
// 않게 매 테스트마다 모듈을 새로 불러온다.
async function loadModule() {
  return import('./pushTokens');
}

describe('pushTokens', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.register.mockResolvedValue(unitResponse());
    mocks._delete.mockResolvedValue(unitResponse());
  });

  it('플랫폼을 서버 표기(대문자)로 바꿔 등록한다', async () => {
    const { registerPushToken } = await loadModule();
    await registerPushToken(IOS_TOKEN);

    expect(mocks.register).toHaveBeenCalledWith(
      { token: 'apns-token', platform: 'IOS' },
      { auth: 'required' },
    );
  });

  it('android 토큰도 등록한다', async () => {
    const { registerPushToken } = await loadModule();
    await registerPushToken({ platform: 'android', value: 'fcm-token' });

    expect(mocks.register).toHaveBeenCalledWith(
      { token: 'fcm-token', platform: 'ANDROID' },
      { auth: 'required' },
    );
  });

  it('등록된 적이 없으면 삭제 요청을 보내지 않는다', async () => {
    const { deleteRegisteredPushToken } = await loadModule();
    await deleteRegisteredPushToken();

    expect(mocks._delete).not.toHaveBeenCalled();
  });

  it('등록에 성공한 토큰을 기억해 뒀다가 삭제한다', async () => {
    const { registerPushToken, deleteRegisteredPushToken } = await loadModule();
    await registerPushToken(IOS_TOKEN);
    await deleteRegisteredPushToken();

    expect(mocks._delete).toHaveBeenCalledWith({ token: 'apns-token' }, { auth: 'required' });
  });

  it('한 번 삭제하면 다시 부르지 않는다', async () => {
    const { registerPushToken, deleteRegisteredPushToken } = await loadModule();
    await registerPushToken(IOS_TOKEN);
    await deleteRegisteredPushToken();
    await deleteRegisteredPushToken();

    expect(mocks._delete).toHaveBeenCalledTimes(1);
  });
});
