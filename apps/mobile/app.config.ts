import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { ConfigContext, ExpoConfig } from 'expo/config';
import { type ConfigPlugin, IOSConfig, withFinalizedMod } from 'expo/config-plugins';
import nativePublicConfig from './native-public-config.json';

type AppVariant = keyof typeof nativePublicConfig.appIds;

const KAKAO_MAVEN_REPOSITORY = 'https://devrepo.kakao.com/nexus/content/groups/public/';

// Firebase 콘솔에서 플랫폼·variant(번들 ID)별로 앱을 등록해야 받을 수 있는 파일이다.
// 커밋하지 않고(gitignore) 로컬 또는 EAS file environment variable 로 공급한다.
// variant 마다 번들 ID 가 달라 Firebase 앱·설정 파일도 1:1 이어야 해서 경로를 나눈다.
function googleServicesFile(variant: AppVariant, platform: 'ios' | 'android'): string {
  const envOverride =
    platform === 'ios'
      ? process.env.GOOGLE_SERVICES_FILE_IOS
      : process.env.GOOGLE_SERVICES_FILE_ANDROID;
  const fileName = platform === 'ios' ? 'GoogleService-Info.plist' : 'google-services.json';
  return envOverride ?? `./firebase/${variant}/${fileName}`;
}

// 관리자가 발급한 팀 개발 프로파일이 이 맥에 설치돼 있으면 본앱·ShareExtension 을 그걸로 수동 서명한다.
// Individual 계정이라 팀원 Xcode 는 자동 서명으로 프로파일을 못 받아오고, prebuild 는 매번 서명 설정을
// 새로 쓰기 때문에 여기서 박아야 유지된다. 프로파일이 없으면(EAS·설치 전) 아무것도 하지 않는다.
// apple-targets 가 ShareExtension 타깃을 자기 mod 에서 따로 쓰므로, 모든 mod 뒤에 도는 finalized 에서 고친다.
const PROVISIONING_PROFILE_DIRS = [
  'Library/Developer/Xcode/UserData/Provisioning Profiles',
  'Library/MobileDevice/Provisioning Profiles',
];

function installedProvisioningProfileNames(): Set<string> {
  const names = new Set<string>();
  for (const dir of PROVISIONING_PROFILE_DIRS) {
    const abs = join(homedir(), dir);
    if (!existsSync(abs)) continue;
    for (const file of readdirSync(abs)) {
      if (!file.endsWith('.mobileprovision')) continue;
      // CMS 서명 안의 plist 는 평문이라 파싱 없이 이름만 뽑는다.
      const match = readFileSync(join(abs, file), 'latin1').match(
        /<key>Name<\/key>\s*<string>([^<]+)<\/string>/,
      );
      if (match) names.add(match[1]);
    }
  }
  return names;
}

const withIosDevSigning: ConfigPlugin = (config) => {
  const { appleTeamId, devProfiles } = nativePublicConfig.ios;
  const installed = installedProvisioningProfileNames();
  if (!Object.values(devProfiles).every((name) => installed.has(name))) return config;

  return withFinalizedMod(config, [
    'ios',
    (config) => {
      const project = IOSConfig.XcodeUtils.getPbxproj(config.modRequest.projectRoot);
      const targets = IOSConfig.Target.findSignableTargets(project).map(([targetId, target]) => {
        const configurations = IOSConfig.XcodeUtils.getBuildConfigurationsForListId(
          project,
          target.buildConfigurationList,
        )
          .map(([, item]) => item.buildSettings)
          .filter((settings) => settings.PRODUCT_NAME);
        const bundleId = String(configurations[0]?.PRODUCT_BUNDLE_IDENTIFIER).replace(/"/g, '');
        return {
          targetId,
          configurations,
          profile: devProfiles[bundleId as keyof typeof devProfiles],
        };
      });
      // development variant 처럼 프로파일이 없는 식별자면 손대지 않는다 — 한쪽만 수동이면 빌드가 깨진다.
      if (!targets.every((target) => target.profile)) return config;

      const projectSection = Object.entries(IOSConfig.XcodeUtils.getProjectSection(project)).filter(
        IOSConfig.XcodeUtils.isNotComment,
      );
      for (const { targetId, configurations, profile } of targets) {
        for (const settings of configurations) {
          settings.CODE_SIGN_STYLE = 'Manual';
          settings.CODE_SIGN_IDENTITY = '"Apple Development"';
          settings.DEVELOPMENT_TEAM = appleTeamId;
          settings.PROVISIONING_PROFILE_SPECIFIER = `"${profile}"`;
        }
        for (const [, item] of projectSection) {
          item.attributes.TargetAttributes ??= {};
          item.attributes.TargetAttributes[targetId] = {
            ...item.attributes.TargetAttributes[targetId],
            DevelopmentTeam: appleTeamId,
            ProvisioningStyle: 'Manual',
          };
        }
      }
      writeFileSync(project.filepath, project.writeSync());
      return config;
    },
  ]);
};

// 웹의 gray-10. 네이티브 스플래시와 웹 첫 화면 배경을 같은 색으로 맞춰 전환 시 색 점프를 없앤다.
const SPLASH_BACKGROUND_COLOR = '#f4f5f7';

// 알림 아이콘 틴트. 웹의 gray-100 이자 적응형 아이콘 배경색과 같은 값이다.
const NOTIFICATION_ICON_COLOR = '#1f1f1f';

// APP_VARIANT 미설정 시 production. 오타·누락으로 엉뚱한 식별자가 만들어지지 않게
// 알 수 없는 값도 production 으로 떨어뜨린다.
function resolveVariant(): AppVariant {
  return process.env.APP_VARIANT === 'development' ? 'development' : 'production';
}

export default ({ config }: ConfigContext): ExpoConfig => withIosDevSigning(baseConfig(config));

function baseConfig(config: ConfigContext['config']): ExpoConfig {
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
  // 막지 않도록 평소엔 경고만 하고, EAS 빌드에서는 지금 빌드 중인 플랫폼의 파일이 없으면 끊는다 —
  // 여기서 안 끊으면 설정 실수(file env 누락)로 푸시가 통째로 죽은 스토어 빌드가 정상처럼 만들어진다.
  // 플랫폼을 가려서 보는 이유는 file env 가 플랫폼이 아니라 environment 단위라, 반대편 플랫폼
  // 파일의 유무로 판정하면 엉뚱한 빌드가 통과해서다.
  const isEasBuild = process.env.EAS_BUILD === 'true';
  const easBuildPlatform = process.env.EAS_BUILD_PLATFORM;
  for (const [platform, filePath, fileName, envVar] of [
    ['ios', iosGoogleServices, 'GoogleService-Info.plist', 'GOOGLE_SERVICES_FILE_IOS'],
    ['android', androidGoogleServices, 'google-services.json', 'GOOGLE_SERVICES_FILE_ANDROID'],
  ] as const) {
    if (existsSync(filePath)) continue;
    const message =
      `[firebase] ${platform} ${fileName} 가 없다: ${filePath} — ` +
      `Firebase 콘솔에서 받아 그 경로에 두거나 ${envVar}(EAS file env)로 공급해라.`;
    // 플랫폼을 못 읽으면(값이 비면) 양쪽 다 요구해 안전한 쪽으로 떨어뜨린다.
    if (isEasBuild && (!easBuildPlatform || easBuildPlatform === platform)) {
      throw new Error(message);
    }
    console.warn(message);
  }

  return {
    ...config,
    // JS 는 process.env 대신 여기서 읽는다.
    extra: {
      ...config.extra,
      webUrl,
      androidNotificationChannelId: nativePublicConfig.android.notificationChannelId,
    },
    name: variant === 'production' ? 'Nook' : `Nook (${variant})`,
    slug: 'nook',
    // Share Extension 은 본앱 식별자를 스킴으로 사용해 본앱을 연다.
    scheme: [appId],
    plugins: [
      ...(config.plugins ?? []),
      // expo-notifications 와 react-native-firebase 가 같은 FCM meta-data 를 각자 선언해
      // 매니페스트 병합이 깨지는 걸 푼다. 모드가 역순으로 실행되므로 맨 앞이 곧 마지막 실행이다.
      './plugins/withFcmNotificationOverride',
      '@bacons/apple-targets',
      'expo-apple-authentication',
      [
        'expo-notifications',
        {
          // 안드로이드는 상태바 아이콘의 알파 채널만 쓰고 색을 버린다. 지정하지 않으면 플러그인이
          // 관련 매니페스트 항목을 아예 지워서 런처 아이콘으로 폴백하는데, 그건 배경이 불투명한
          // 정사각형이라 마스킹 결과가 흰 사각형이 된다 — 투명 배경 흰 실루엣을 따로 준다.
          icon: './assets/notification-icon.png',
          color: NOTIFICATION_ICON_COLOR,
          // 앱이 죽어 있을 때 오는 알림은 앱 코드 없이 FCM SDK 가 띄운다. 이 채널을 못 찾으면
          // 사용자 알림 설정에 "기타" 로 잡히므로, 같은 id 의 채널을 앱 시작 시 만든다
          // (src/notifications/pushNotifications.ts).
          defaultChannel: nativePublicConfig.android.notificationChannelId,
        },
      ],
      [
        'expo-location',
        {
          // 지도 화면의 현재 위치 조회(GET_CURRENT_POSITION). 웹의 navigator.geolocation 은
          // iOS 에서 앱을 켤 때마다 오리진 프롬프트를 다시 띄워 셸이 대신 조회한다.
          locationWhenInUsePermission:
            '지도에서 현재 위치와 저장한 장소까지의 거리를 보여주기 위해 위치 정보를 사용해요.',
          // 앱을 쓰는 동안만 조회한다. 비워두면 플러그인이 영문 기본 문구로 Always·모션 권한
          // 설명까지 채워 쓰지도 않는 권한을 신고하게 된다 — false 는 키 자체를 지운다.
          locationAlwaysAndWhenInUsePermission: false,
          locationAlwaysPermission: false,
          motionUsagePermission: false,
        },
      ],
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
      // expo-image-picker 가 동영상용으로 넣지만 사진만 쓰므로 뺀다.
      blockedPermissions: ['android.permission.RECORD_AUDIO'],
    },
  };
}
