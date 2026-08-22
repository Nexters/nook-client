import { existsSync } from 'node:fs';
import type { ConfigContext, ExpoConfig } from 'expo/config';
import nativePublicConfig from './native-public-config.json';

type AppVariant = keyof typeof nativePublicConfig.appIds;

const KAKAO_MAVEN_REPOSITORY = 'https://devrepo.kakao.com/nexus/content/groups/public/';

// Firebase 콘솔에서 플랫폼·variant(번들 ID)별로 앱을 등록해야 받을 수 있는 파일이다.
// 커밋하지 않고(gitignore) 로컬 또는 EAS file environment variable 로 공급한다.
// variant 마다 번들 ID 가 달라 Firebase 앱·설정 파일도 1:1 이어야 해서 경로를 나눈다.
// 현재 등록 상태: iOS production·development 등록됨. Android 는 Firebase 미등록.
function googleServicesFile(variant: AppVariant, platform: 'ios' | 'android'): string {
  const envOverride =
    platform === 'ios'
      ? process.env.GOOGLE_SERVICES_FILE_IOS
      : process.env.GOOGLE_SERVICES_FILE_ANDROID;
  const fileName = platform === 'ios' ? 'GoogleService-Info.plist' : 'google-services.json';
  return envOverride ?? `./firebase/${variant}/${fileName}`;
}

// 웹의 gray-10. 네이티브 스플래시와 웹 첫 화면 배경을 같은 색으로 맞춰 전환 시 색 점프를 없앤다.
const SPLASH_BACKGROUND_COLOR = '#f4f5f7';

// APP_VARIANT 미설정 시 production. 오타·누락으로 엉뚱한 식별자가 만들어지지 않게
// 알 수 없는 값도 production 으로 떨어뜨린다.
function resolveVariant(): AppVariant {
  return process.env.APP_VARIANT === 'development' ? 'development' : 'production';
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = resolveVariant();
  const appId = nativePublicConfig.appIds[variant];
  const sessionAccessGroup = `$(AppIdentifierPrefix)group.${appId}`;

  // 기본값은 SSOT 에서 오고, env 는 로컬 개발용 오버라이드로만 쓴다
  // (실기기에서 vite preview 를 LAN IP 로 띄우는 경우 등).
  const webUrl = process.env.EXPO_PUBLIC_WEB_URL ?? nativePublicConfig.webUrl[variant];

  // 카카오 앱 키는 평문으로 커밋하지 않는다. EAS Environment Variables(KAKAO_NATIVE_APP_KEY_DEV/PROD)
  // 또는 로컬 .env 로만 공급한다. eas.json 의 environment 필드(EAS 가 자동 주입하는 기준)가 아니라
  // variant 로 직접 고르는 이유는 device 프로필처럼 environment=development 이면서
  // APP_VARIANT=production 인 조합이 있어, environment 기준으로는 엉뚱한 키가 섞여 들어가서다.
  const kakaoAppKey =
    variant === 'development'
      ? process.env.KAKAO_NATIVE_APP_KEY_DEV
      : process.env.KAKAO_NATIVE_APP_KEY_PROD;

  const iosGoogleServices = googleServicesFile(variant, 'ios');
  const androidGoogleServices = googleServicesFile(variant, 'android');

  // 파일이 없으면 Firebase 없이 빌드된다(런타임 가드가 푸시만 조용히 끈다). 로컬 Metro 까지
  // 막지 않도록 평소엔 경고만 하고, EAS 빌드에서는 variant 와 무관하게 끊는다 — 여기서 안 끊으면
  // 설정 실수(file env 누락)로 푸시가 통째로 죽은 스토어 빌드가 정상처럼 만들어진다.
  if (!existsSync(iosGoogleServices)) {
    const message =
      `[firebase] iOS GoogleService-Info.plist 가 없다: ${iosGoogleServices} — ` +
      'Firebase 콘솔에서 받아 그 경로에 두거나 GOOGLE_SERVICES_FILE_IOS(EAS file env)로 공급해라.';
    if (process.env.EAS_BUILD === 'true') throw new Error(message);
    console.warn(message);
  }

  return {
    ...config,
    // JS 는 process.env 대신 여기서 읽는다.
    extra: {
      ...config.extra,
      webUrl,
    },
    name: variant === 'production' ? 'Nook' : `Nook (${variant})`,
    slug: 'nook',
    // Share Extension 은 본앱 식별자를 스킴으로 사용해 본앱을 연다.
    scheme: [appId],
    plugins: [
      ...(config.plugins ?? []),
      '@bacons/apple-targets',
      'expo-apple-authentication',
      'expo-notifications',
      // SPM(기본값)으로 받으면 use_frameworks! 를 dynamic 으로 바꿔야 하는데, 그러면
      // kakao-login 이 링크 단계에서 깨진다(_RCTRegisterModule 심볼을 못 찾음).
      // CocoaPods 로 받게 돌려 기존 static 링크를 그대로 둔다.
      ['@react-native-firebase/app', { ios: { disableSPM: true } }],
      '@react-native-firebase/messaging',
      [
        'expo-build-properties',
        {
          android: {
            extraMavenRepos: [KAKAO_MAVEN_REPOSITORY],
          },
          ios: {
            // GoogleUtilities(Firebase 의 CocoaPods 의존성)가 모듈을 정의하지 않아
            // 기본 static 링크에서 Swift 가 못 읽는다 — modular_headers 로 강제한다.
            extraPods: [{ name: 'GoogleUtilities', modular_headers: true }],
          },
        },
      ],
      [
        'expo-splash-screen',
        {
          // 로고·워드마크·태그라인이 한 장에 담긴 시안 이미지. 네이티브 스플래시는 이미지 하나만 받는다.
          image: './assets/splash.png',
          backgroundColor: SPLASH_BACKGROUND_COLOR,
          // imageWidth 는 캔버스 전체를 몇 pt 로 그릴지다. 태그라인이 길어지며 시안 가로폭이
          // 672 → 756px 로 넓어져서, 로고를 이전과 같은 크기로 유지하려면 같은 비율로 키워야 한다.
          imageWidth: 225,
          resizeMode: 'contain',
          // Android 12+ 는 스플래시 이미지를 원형으로 잘라 보여준다(캔버스의 66.7%만 노출).
          // 태그라인까지 넣으면 가장자리가 잘려서, 원 안에 들어가는 로고+워드마크만 쓴다.
          android: {
            image: './assets/splash-android.png',
            imageWidth: 200,
          },
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission: '프로필 이미지를 앨범에서 선택하기 위해 사진에 접근해요.',
          cameraPermission: '프로필 이미지를 촬영하기 위해 카메라를 사용해요.',
          // 프로필 이미지는 사진만 다뤄(mediaTypes: ['images']) 마이크를 쓰지 않는다.
          // 비워두면 플러그인이 영문 기본 문구로 NSMicrophoneUsageDescription 을 채워
          // 쓰지도 않는 권한을 요구하게 된다 — false 는 문구가 아니라 키 자체를 지운다.
          microphonePermission: false,
        },
      ],
      [
        '@react-native-seoul/kakao-login',
        {
          kakaoAppKey,
          kotlinVersion: nativePublicConfig.android.kotlinVersion,
        },
      ],
    ],
    // development 는 DEV 라벨이 붙은 별도 아이콘을 써서 홈스크린에서 production 과 구분한다.
    icon: variant === 'development' ? './assets/icon-dev.png' : './assets/icon.png',
    ios: {
      ...config.ios,
      appleTeamId: process.env.APPLE_TEAM_ID,
      bundleIdentifier: appId,
      // Sign in with Apple entitlement 을 주입한다. Apple Developer 의 App ID 에도
      // 같은 capability 가 켜져 있어야 프로비저닝이 맞는다.
      usesAppleSignIn: true,
      ...(existsSync(iosGoogleServices) ? { googleServicesFile: iosGoogleServices } : {}),
      infoPlist: {
        ...config.ios?.infoPlist,
        // 미설정이면 EAS 가 매 빌드마다 물어보고 그 답을 app config 에 되쓴다. HTTPS 만
        // 쓰므로 수출 규제 면제 대상이고, 값을 박아두면 App Store Connect 수동 설정도 없다.
        ITSAppUsesNonExemptEncryption: false,
        // 미설정이면 Xcode 프로젝트의 developmentRegion(en) 이 그대로 들어가 앱이 영어
        // 단일 언어로 신고된다. 시스템 권한 안내·기본 다이얼로그와 App Store 기본 언어를
        // 한국어로 맞추기 위해 명시한다.
        CFBundleDevelopmentRegion: 'ko',
        CFBundleLocalizations: ['ko'],
        // NSLocalNetworkUsageDescription 은 여기서 지정하지 않는다. Metro 검색용이라
        // 개발 빌드에만 필요한데, expo-dev-launcher 가 자기 기본 문구로 넣고 Release
        // 빌드에서 도로 지운다 — 단, 그 정리 스크립트는 "Expo Dev Launcher" 가 들어간
        // 자기 문구일 때만 지운다. 우리 문구로 덮어쓰면 정리를 피해 스토어 빌드까지
        // 따라 들어가고, 사용자는 "개발용" 이라는 알 수 없는 설명을 보게 된다.
        // WebView(WKWebView) 내 지도 화면의 navigator.geolocation 호출용.
        NSLocationWhenInUseUsageDescription:
          '지도에서 현재 위치와 저장한 장소까지의 거리를 보여주기 위해 위치 정보를 사용해요.',
        NookSessionAccessGroup: sessionAccessGroup,
        NookAppGroup: `group.${appId}`,
      },
      entitlements: {
        ...config.ios?.entitlements,
        // 공유 확장 ↔ 본앱 데이터 전달 통로. 앱 식별자와 함께 움직여야 한다.
        'com.apple.security.application-groups': [`group.${appId}`],
        'keychain-access-groups': [sessionAccessGroup],
      },
    },
    android: {
      ...config.android,
      package: appId,
      ...(existsSync(androidGoogleServices) ? { googleServicesFile: androidGoogleServices } : {}),
      adaptiveIcon: {
        ...config.android?.adaptiveIcon,
        foregroundImage:
          variant === 'development'
            ? './assets/android-icon-foreground-dev.png'
            : './assets/android-icon-foreground.png',
      },
      // WebView geolocationEnabled 로 navigator.geolocation 을 쓰려면 필요하다.
      permissions: [
        ...(config.android?.permissions ?? []),
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION',
      ],
      // expo-image-picker 가 동영상용으로 넣지만 사진만 쓰므로 뺀다.
      blockedPermissions: ['android.permission.RECORD_AUDIO'],
    },
  };
};
