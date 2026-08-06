import type { BridgeMessage, SocialProvider } from './message';

export type SessionStatus = 'bootstrapping' | 'authenticated' | 'anonymous';

export type SocialLoginStatus = 'success' | 'cancelled' | 'error';

/** 백엔드 소셜 인증 API 의 자격증명 필드와 1:1 대응한다. provider 마다 채워지는 값이 다르다. */
export interface SocialCredential {
  /** apple */
  identityToken?: string;
  /** apple */
  authorizationCode?: string;
  /** kakao */
  accessToken?: string;
}

export type NativeToWeb =
  | BridgeMessage<'APP_RESUMED', Record<string, never>>
  | BridgeMessage<
      'SOCIAL_LOGIN_RESULT',
      {
        requestId: string;
        provider: SocialProvider;
        status: SocialLoginStatus;
        /** status 가 success 일 때만 존재한다. */
        credential?: SocialCredential;
      }
    >
  | BridgeMessage<
      'SESSION_RESULT',
      { requestId: string; status: SessionStatus; accessToken?: string; revision?: number }
    >
  | BridgeMessage<'SESSION_CLEARED', { reason: string }>;
