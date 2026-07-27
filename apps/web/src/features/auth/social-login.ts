export const SOCIAL_LOGIN_REQUEST_EVENT = 'nook:social-login-request';

export type SocialLoginProvider = 'kakao' | 'apple';

export interface SocialLoginRequestDetail {
  provider: SocialLoginProvider;
}

/**
 * OAuth 구현이 연결되기 전까지 UI와 인증 어댑터 사이의 경계를 유지한다.
 * 네이티브 셸 또는 웹 인증 모듈은 이 이벤트를 구독해 각 provider 로그인을 시작한다.
 */
export function requestSocialLogin(provider: SocialLoginProvider): void {
  window.dispatchEvent(
    new CustomEvent<SocialLoginRequestDetail>(SOCIAL_LOGIN_REQUEST_EVENT, {
      detail: { provider },
    }),
  );
}
