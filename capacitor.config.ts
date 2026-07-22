import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor 설정. 서비스 본체 웹 번들을 앱에 내장하는 전통 구조.
 *
 * dev 라이브리로드는 `CAP_DEV=1` 일 때만 원격 dev 서버를 가리키도록 게이트한다.
 * → prod 번들에는 server.url / cleartext 가 절대 포함되지 않는다.
 *   에뮬레이터(안드로이드)는 10.0.2.2, iOS 시뮬레이터는 localhost 로 호스트에 도달.
 */
const isDev = process.env.CAP_DEV === '1';

const config: CapacitorConfig = {
  appId: 'com.nook.app',
  appName: 'nook',
  webDir: 'dist',
  server: {
    // iOS 기본 scheme(capacitor://)을 https 로 맞춰 안드로이드(기본 https://)와 origin 을
    // https://localhost 로 통일한다. 카카오맵 등 https origin 을 요구하는 SDK 대응용.
    iosScheme: 'https',
    ...(isDev
      ? {
          url: 'http://10.0.2.2:5173',
          cleartext: true,
        }
      : {}),
  },
};

export default config;
