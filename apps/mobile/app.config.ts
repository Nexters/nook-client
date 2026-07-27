import type { ConfigContext, ExpoConfig } from 'expo/config';

type AppVariant = 'development' | 'preview' | 'production';

const SUFFIX: Record<AppVariant, string> = {
  development: '.dev',
  preview: '.preview',
  production: '',
};

// APP_VARIANT 미설정 시 production. 오타·누락으로 엉뚱한 식별자가 만들어지지 않게
// 알 수 없는 값도 production 으로 떨어뜨린다.
function resolveVariant(): AppVariant {
  const value = process.env.APP_VARIANT;
  return value === 'development' || value === 'preview' ? value : 'production';
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = resolveVariant();
  // dev/preview 를 같은 기기에 동시 설치할 수 있도록 식별자를 분리한다.
  const appId = `com.nook.app${SUFFIX[variant]}`;

  return {
    ...config,
    name: variant === 'production' ? 'nook' : `nook (${variant})`,
    slug: 'nook',
    plugins: [...(config.plugins ?? []), '@bacons/apple-targets'],
    ios: {
      ...config.ios,
      appleTeamId: process.env.APPLE_TEAM_ID,
      bundleIdentifier: appId,
      infoPlist: {
        ...config.ios?.infoPlist,
        NSLocalNetworkUsageDescription: '개발용 로컬 웹 서버에 연결하기 위해 사용합니다.',
      },
      entitlements: {
        ...config.ios?.entitlements,
        // 공유 확장 ↔ 본앱 데이터 전달 통로. 앱 식별자와 함께 움직여야 한다.
        'com.apple.security.application-groups': [`group.${appId}`],
      },
      infoPlist: {
        ...config.ios?.infoPlist,
        // WebView(WKWebView) 내 지도 화면의 navigator.geolocation 호출용.
        NSLocationWhenInUseUsageDescription:
          '내 주변 장소를 지도에 표시하기 위해 위치 정보를 사용해요.',
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
