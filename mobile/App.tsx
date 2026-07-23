import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef } from 'react';
import { Linking, Platform, SafeAreaView, StyleSheet } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

// 스파이크: iOS 시뮬은 localhost 로 host 접근. 실기기는 LAN IP / 프로덕션은 app.nook.com
const WEB_URL = 'http://172.127.2.17:5173';

// 웹 로드 전에 플랫폼 힌트 주입 (RN webview 는 window.ReactNativeWebView 를 자동 제공)
const INJECT_BEFORE = `window.__nookPlatform = ${JSON.stringify(Platform.OS)}; true;`;

export default function App() {
  const ref = useRef<WebView>(null);

  // 네이티브 → 웹
  const postToWeb = useCallback((message: object) => {
    const json = JSON.stringify(message);
    ref.current?.injectJavaScript(
      `window.__nookReceive && window.__nookReceive(${JSON.stringify(json)}); true;`,
    );
  }, []);

  // 웹 → 네이티브
  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      let message: { type?: string; payload?: { url?: string } };
      try {
        message = JSON.parse(event.nativeEvent.data);
      } catch {
        return;
      }
      switch (message.type) {
        case 'WEB_READY':
          // 핸드셰이크 → 스파이크: 테스트 공유 1건 전달 (raw 셸의 SHARE_RECEIVED 와 동일 계약)
          postToWeb({
            v: 1,
            type: 'SHARE_RECEIVED',
            payload: { items: [{ text: 'FROM_EXPO_SHELL' }] },
          });
          break;
        case 'OPEN_EXTERNAL_URL':
          if (message.payload?.url) Linking.openURL(message.payload.url);
          break;
        default:
          break;
      }
    },
    [postToWeb],
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <WebView
        ref={ref}
        source={{ uri: WEB_URL }}
        injectedJavaScriptBeforeContentLoaded={INJECT_BEFORE}
        onMessage={onMessage}
        originWhitelist={['*']}
        style={styles.webview}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  webview: { flex: 1 },
});
