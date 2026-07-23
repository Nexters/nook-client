import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef } from 'react';
import { Linking, Platform, SafeAreaView, StyleSheet } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

// 원격 웹 URL (.env: app.nook.com / .env.local: dev 오버라이드). 미설정 시 즉시 실패.
const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL;
if (!WEB_URL) {
  throw new Error('EXPO_PUBLIC_WEB_URL 미설정');
}

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
