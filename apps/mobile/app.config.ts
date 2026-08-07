import type { ConfigContext, ExpoConfig } from 'expo/config';
import nativePublicConfig from './native-public-config.json';

type AppVariant = keyof typeof nativePublicConfig.appIds;

const KAKAO_MAVEN_REPOSITORY = 'https://devrepo.kakao.com/nexus/content/groups/public/';

// APP_VARIANT 미설정 시 production. 오타·누락으로 엉뚱한 식별자가 만들어지지 않게
// 알 수 없는 값도 production 으로 떨어뜨린다.
function resolveVariant(): AppVariant {
  return process.env.APP_VARIANT === 'development' ? 'development' : 'production';
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = resolveVariant();
  const appId = nativePublicConfig.appIds[variant];
  const sessionAccessGroup = `$(AppIdentifierPrefix)group.${appId}`;

  return {
    ...config,
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
        NookApiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? '',
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
    },
  };
};
