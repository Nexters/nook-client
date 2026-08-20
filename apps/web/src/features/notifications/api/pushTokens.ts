import type { PushToken } from '@nook/bridge-contracts';
import {
  _delete as deletePushTokenEndpoint,
  RegisterPushTokenRequestPlatform,
  register as registerPushTokenEndpoint,
  unwrapApiResponse,
} from '@/shared/api';

// 로그아웃 시점엔 세션이 먼저 지워져 있을 수 있어(clear() 가 accessToken 을 비운 뒤 화면이
// 반응한다), 마지막으로 등록에 성공한 토큰을 여기 기억해 뒀다가 토큰이 아직 유효할 때
// 삭제 요청을 먼저 보낸다. 삭제가 성공했을 때만 비워서, 실패하면 재시도가 가능하다.
let lastRegisteredToken: string | null = null;

// 등록(PUT)과 삭제(DELETE)를 한 줄로 세운다. 등록은 fire-and-forget 으로 나가므로,
// 직렬화하지 않으면 "PUT 진행 중 → 로그아웃 DELETE 완료 → 뒤늦게 PUT 완료" 순서로
// 끝나 로그아웃한 기기의 토큰이 서버에 되살아난다. 큐에 세우면 DELETE 가 항상 앞선
// PUT 이 끝난 뒤에 실행되고, 그 시점의 최신 등록 토큰을 지운다.
let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

function toApiPlatform(platform: PushToken['platform']): RegisterPushTokenRequestPlatform {
  return platform === 'ios'
    ? RegisterPushTokenRequestPlatform.IOS
    : RegisterPushTokenRequestPlatform.ANDROID;
}

export function registerPushToken(token: PushToken): Promise<void> {
  return enqueue(async () => {
    unwrapApiResponse(
      await registerPushTokenEndpoint(
        { token: token.value, platform: toApiPlatform(token.platform) },
        { auth: 'required' },
      ),
    );
    lastRegisteredToken = token.value;
  });
}

/** 로그아웃·탈퇴 직전에 호출한다. 등록에 성공한 적이 없으면 아무 것도 하지 않는다. */
export function deleteRegisteredPushToken(): Promise<void> {
  return enqueue(async () => {
    // 큐 실행 시점에 읽어야 직전에 끝난 등록(토큰 refresh 포함)의 최신 값을 지운다.
    const token = lastRegisteredToken;
    if (!token) return;
    unwrapApiResponse(await deletePushTokenEndpoint({ token }, { auth: 'required' }));
    lastRegisteredToken = null;
  });
}
