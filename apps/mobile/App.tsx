import type { WebToNative } from '@nook/bridge-contracts';
import { StatusBar } from 'expo-status-bar';
import { useCallback } from 'react';
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
  const onMessage = useCallback((event: WebViewMessageEvent) => {
    let message: WebToNative;
    try {
      message = JSON.parse(event.nativeEvent.data) as WebToNative;
    } catch {
      return;
    }
    switch (message.type) {
      case 'OPEN_EXTERNAL_URL':
        if (message.payload.url) Linking.openURL(message.payload.url);
        break;
      default:
        break;
    }
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <WebView
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
