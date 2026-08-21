import { useEffect } from 'react';
import { useAuthSession } from '@/features/auth/session/AuthSessionProvider';
import { registerPushToken } from '@/features/notifications/api/pushTokens';
import { nativeBridge } from '@/native-bridge';

/**
 * 로그인 상태와 FCM 토큰을 서버 등록에 동기화한다.
 * - 로그인 성공 직후·앱 시작 시 이미 로그인 상태: 권한 상태만 조용히 조회해, 이미 허용한
 *   사용자의 토큰을 재등록한다. OS 권한 다이얼로그는 여기서 절대 띄우지 않는다 — 그건
 *   맥락이 있는 시점(게시물 저장 처리 중 프라이밍 시트)의 몫이다.
 * - FCM 토큰이 재발급되면(재설치·복원 등) 새 토큰으로 다시 등록한다.
 *
 * 삭제(로그아웃·탈퇴)는 여기서 다루지 않는다 — 세션이 지워진 뒤에는 인증된 API 를 보낼 수
 * 없어, 토큰이 아직 유효한 그 화면의 호출부(`deleteRegisteredPushToken`)에서 먼저 지운다.
 */
export function PushTokenSyncHost() {
  const { status } = useAuthSession();

  useEffect(() => {
    if (!nativeBridge.isNative || status !== 'authenticated') return;
    void nativeBridge.requestPushStatus().then((result) => {
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
