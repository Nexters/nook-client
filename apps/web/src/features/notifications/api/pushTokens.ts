import type { PushToken } from '@nook/bridge-contracts';
import {
  _delete as deletePushTokenEndpoint,
  RegisterPushTokenRequestPlatform,
  register as registerPushTokenEndpoint,
  unwrapApiResponse,
} from '@/shared/api';

// 로그아웃 시점엔 세션이 먼저 지워져 있을 수 있어(clear() 가 accessToken 을 비운 뒤 화면이
// 반응한다), 마지막으로 등록에 성공한 토큰을 여기 기억해 뒀다가 토큰이 아직 유효할 때
// 삭제 요청을 먼저 보낸다.
let lastRegisteredToken: string | null = null;

function toApiPlatform(platform: PushToken['platform']): RegisterPushTokenRequestPlatform {
  return platform === 'ios'
    ? RegisterPushTokenRequestPlatform.IOS
    : RegisterPushTokenRequestPlatform.ANDROID;
}

export async function registerPushToken(token: PushToken): Promise<void> {
  unwrapApiResponse(
    await registerPushTokenEndpoint(
      { token: token.value, platform: toApiPlatform(token.platform) },
      { auth: 'required' },
    ),
  );
  lastRegisteredToken = token.value;
}

/** 로그아웃·탈퇴 직전에 호출한다. 등록에 성공한 적이 없으면 아무 것도 하지 않는다. */
export async function deleteRegisteredPushToken(): Promise<void> {
  if (!lastRegisteredToken) return;
  const token = lastRegisteredToken;
  lastRegisteredToken = null;
  unwrapApiResponse(await deletePushTokenEndpoint({ token }, { auth: 'required' }));
}
