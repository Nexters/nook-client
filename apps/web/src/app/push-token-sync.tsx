import { useEffect } from 'react';
import { useAuthSession } from '@/features/auth/session/AuthSessionProvider';
import { registerPushToken } from '@/features/notifications/api/pushTokens';
import { nativeBridge } from '@/native-bridge';

/**
 * 로그인 상태와 FCM 토큰을 서버 등록에 동기화한다.
 * - 로그인 성공 직후·앱 시작 시 이미 로그인 상태: 권한을 확인하고 토큰을 등록한다.
 * - FCM 토큰이 재발급되면(재설치·복원 등) 새 토큰으로 다시 등록한다.
 *
 * 삭제(로그아웃·탈퇴)는 여기서 다루지 않는다 — 세션이 지워진 뒤에는 인증된 API 를 보낼 수
 * 없어, 토큰이 아직 유효한 그 화면의 호출부(`deleteRegisteredPushToken`)에서 먼저 지운다.
 */
export function PushTokenSyncHost() {
  const { status } = useAuthSession();

  useEffect(() => {
    if (!nativeBridge.isNative || status !== 'authenticated') return;
    void nativeBridge.requestPushPermission().then((result) => {
      if (result.token) void registerPushToken(result.token).catch(() => undefined);
    });
  }, [status]);

  useEffect(() => {
    if (!nativeBridge.isNative) return undefined;
    return nativeBridge.on((message) => {
      if (message.type !== 'PUSH_TOKEN_REFRESHED' || status !== 'authenticated') return;
      void registerPushToken(message.payload.token).catch(() => undefined);
    });
  }, [status]);

  return null;
}
