import type { ConfigContext, ExpoConfig } from 'expo/config';
import nativePublicConfig from './native-public-config.json';

type AppVariant = keyof typeof nativePublicConfig.appIds;

const KAKAO_MAVEN_REPOSITORY = 'https://devrepo.kakao.com/nexus/content/groups/public/';

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
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? nativePublicConfig.apiBaseUrl[variant];

  return {
    ...config,
    // JS 는 process.env 대신 여기서 읽는다. 네이티브(Info.plist)와 같은 출처를 보게 하려는 것.
    extra: {
      ...config.extra,
      webUrl,
      apiBaseUrl,
    },
    name: variant === 'production' ? 'nook' : `nook (${variant})`,
    slug: 'nook',
    // Share Extension 은 본앱 식별자를 스킴으로 사용해 본앱을 연다.
    scheme: [appId],
    plugins: [
      ...(config.plugins ?? []),
      '@bacons/apple-targets',
      'expo-apple-authentication',
      [
        'expo-build-properties',
        {
          android: {
            extraMavenRepos: [KAKAO_MAVEN_REPOSITORY],
          },
        },
      ],
      [
        'expo-splash-screen',
        {
          // 로고·워드마크·태그라인이 한 장에 담긴 시안 이미지. 네이티브 스플래시는 이미지 하나만 받는다.
          image: './assets/splash.png',
          backgroundColor: SPLASH_BACKGROUND_COLOR,
          imageWidth: 200,
          resizeMode: 'contain',
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission: '프로필 이미지를 앨범에서 선택하기 위해 사진에 접근해요.',
          cameraPermission: '프로필 이미지를 촬영하기 위해 카메라를 사용해요.',
        },
      ],
      [
        '@react-native-seoul/kakao-login',
        {
          kakaoAppKey: nativePublicConfig.kakao.nativeAppKey,
          kotlinVersion: nativePublicConfig.android.kotlinVersion,
        },
      ],
    ],
    ios: {
      ...config.ios,
      appleTeamId: process.env.APPLE_TEAM_ID,
      bundleIdentifier: appId,
      // Sign in with Apple entitlement 을 주입한다. Apple Developer 의 App ID 에도
      // 같은 capability 가 켜져 있어야 프로비저닝이 맞는다.
      usesAppleSignIn: true,
      infoPlist: {
        ...config.ios?.infoPlist,
        // 미설정이면 EAS 가 매 빌드마다 물어보고 그 답을 app config 에 되쓴다. HTTPS 만
        // 쓰므로 수출 규제 면제 대상이고, 값을 박아두면 App Store Connect 수동 설정도 없다.
        ITSAppUsesNonExemptEncryption: false,
        NSLocalNetworkUsageDescription: '개발용 로컬 웹 서버에 연결하기 위해 사용합니다.',
        // WebView(WKWebView) 내 지도 화면의 navigator.geolocation 호출용.
        NSLocationWhenInUseUsageDescription:
          '내 주변 장소를 지도에 표시하기 위해 위치 정보를 사용해요.',
        NookSessionAccessGroup: sessionAccessGroup,
        NookApiBaseUrl: apiBaseUrl,
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
