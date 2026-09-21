const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

// expo-notifications 와 @react-native-firebase/messaging 이 같은 FCM meta-data 를 각자 선언한다.
// RNFirebase 는 라이브러리 매니페스트에 firebase.json 값을 채워 넣는데, 우리가 firebase.json 을
// 쓰지 않아 채널 id 는 빈 문자열, 색은 @color/white 가 들어간다. 값이 서로 달라 매니페스트 병합이
// 실패하므로(:app:processReleaseMainManifest), expo-notifications 가 넣은 값을 쓰겠다고 명시한다.
//
// 모드는 plugins 배열의 역순으로 실행된다 — 이 플러그인이 다른 플러그인이 만든 노드를 모두 보려면
// 배열 맨 앞에 있어야 한다. expo-notifications 뒤에 두면 channel_id 가 아직 없어서 놓친다.
const OVERRIDDEN_META_DATA = [
  ['com.google.firebase.messaging.default_notification_channel_id', 'android:value'],
  ['com.google.firebase.messaging.default_notification_color', 'android:resource'],
];

const TOOLS_NAMESPACE = 'http://schemas.android.com/tools';

module.exports = function withFcmNotificationOverride(config) {
  return withAndroidManifest(config, (config) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    config.modResults.manifest.$['xmlns:tools'] = TOOLS_NAMESPACE;

    for (const [name, attribute] of OVERRIDDEN_META_DATA) {
      const item = application['meta-data']?.find((meta) => meta.$['android:name'] === name);
      if (item) item.$['tools:replace'] = attribute;
    }

    return config;
  });
};
