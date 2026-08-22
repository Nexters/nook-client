import type { BridgeMessage, ImagePickSource, SocialProvider } from './message';

export type SessionStatus = 'bootstrapping' | 'authenticated' | 'anonymous';

export type SocialLoginStatus = 'success' | 'cancelled' | 'error';

export type ImagePickStatus = 'success' | 'cancelled' | 'error';

export type PushPermissionStatus = 'granted' | 'denied' | 'undetermined';

/** FCM(Android)·APNs(iOS) 원시 디바이스 토큰. 서버 등록(`PUT /api/v1/me/push-tokens`)은 웹이 한다. */
export interface PushToken {
  platform: 'ios' | 'android';
  value: string;
}

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
  | BridgeMessage<'SESSION_CLEARED', { reason: string }>
  | BridgeMessage<
      'PUSH_PERMISSION_RESULT',
      { requestId: string; status: PushPermissionStatus; token?: PushToken }
    >
  // 알림을 탭해 앱이 열렸다(콜드 스타트 포함). 라우팅 판단은 웹이 data 를 보고 한다.
  | BridgeMessage<
      'PUSH_NOTIFICATION_OPENED',
      { data: Record<string, string>; title?: string; body?: string }
    >
  // FCM 토큰이 재발급됐다(재설치·복원 등). 요청 없이 오는 이벤트라 requestId 가 없다.
  | BridgeMessage<'PUSH_TOKEN_REFRESHED', { token: PushToken }>;
