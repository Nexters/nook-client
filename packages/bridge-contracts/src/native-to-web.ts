import type { BridgeMessage, ImagePickSource, SocialProvider } from './message';

export type SessionStatus = 'bootstrapping' | 'authenticated' | 'anonymous';

export type SocialLoginStatus = 'success' | 'cancelled' | 'error';

export type ImagePickStatus = 'success' | 'cancelled' | 'error';

/** base64 데이터 URI 로 조립할 수 있는 최소 정보. 픽커 단계에서 리사이즈·압축을 끝낸 값이다. */
export interface PickedImage {
  base64: string;
  mimeType: string;
  width: number;
  height: number;
}

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
  // Android 하드웨어 뒤로가기. 오버레이 닫기·히스토리 뒤로 등 처리는 웹이 결정한다.
  | BridgeMessage<'BACK_REQUESTED', Record<string, never>>
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
      'IMAGE_PICK_RESULT',
      {
        requestId: string;
        source: ImagePickSource;
        status: ImagePickStatus;
        /** status 가 success 일 때만 존재한다. */
        image?: PickedImage;
      }
    >
  | BridgeMessage<
      'SESSION_RESULT',
      { requestId: string; status: SessionStatus; accessToken?: string; revision?: number }
    >
  | BridgeMessage<'SESSION_CLEARED', { reason: string }>;
