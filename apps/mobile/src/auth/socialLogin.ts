import type { SocialCredential, SocialLoginStatus, SocialProvider } from '@nook/bridge-contracts';
import { login as kakaoLogin } from '@react-native-seoul/kakao-login';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';

export interface SocialLoginOutcome {
  status: SocialLoginStatus;
  credential?: SocialCredential;
}

const CANCELLED: SocialLoginOutcome = { status: 'cancelled' };
const FAILED: SocialLoginOutcome = { status: 'error' };

function errorCode(error: unknown): string {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code: unknown }).code)
    : '';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function signInWithApple(): Promise<SocialLoginOutcome> {
  // 웹은 iOS 에서만 Apple 버튼을 노출하지만 요청 자체는 언제든 올 수 있어 여기서도 막는다.
  if (Platform.OS !== 'ios' || !(await AppleAuthentication.isAvailableAsync())) {
    return FAILED;
  }

  try {
    const { identityToken, authorizationCode } = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    const credential: SocialCredential = {};
    if (identityToken) credential.identityToken = identityToken;
    if (authorizationCode) credential.authorizationCode = authorizationCode;

    // 백엔드가 검증할 값이 하나도 없으면 인증을 이어갈 수 없다.
    return identityToken || authorizationCode ? { status: 'success', credential } : FAILED;
  } catch (error) {
    return errorCode(error) === 'ERR_REQUEST_CANCELED' ? CANCELLED : FAILED;
  }
}

async function signInWithKakao(): Promise<SocialLoginOutcome> {
  try {
    const { accessToken } = await kakaoLogin();
    return accessToken ? { status: 'success', credential: { accessToken } } : FAILED;
  } catch (error) {
    // 카카오 RN 래퍼는 모든 실패를 code "RNKakaoLogins" 로 넘겨 취소를 코드로 구분할 수 없다.
    // 메시지로만 판별하므로 놓친 취소는 error 로 떨어진다.
    return /cancel/i.test(errorMessage(error)) ? CANCELLED : FAILED;
  }
}

/** provider SDK 만 실행해 자격증명을 돌려준다. 백엔드 인증과 세션 저장은 웹이 이어서 한다. */
export function runSocialLogin(provider: SocialProvider): Promise<SocialLoginOutcome> {
  return provider === 'apple' ? signInWithApple() : signInWithKakao();
}
