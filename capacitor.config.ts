import type { CapacitorConfig } from '@capacitor/cli';

// CAP_DEV=1 이면 dev 서버 라이브리로드 (prod 번들에는 미포함)
const isDev = process.env.CAP_DEV === '1';

const config: CapacitorConfig = {
  appId: 'com.nook.app',
  appName: 'nook',
  webDir: 'dist',
  plugins: {
    CapacitorShareTarget: {
      appGroupId: 'group.com.nook.app.dev',
    },
  },
  ...(isDev
    ? {
        server: {
          url: 'http://10.0.2.2:5173',
          cleartext: true,
        },
      }
    : {}),
};

export default config;
