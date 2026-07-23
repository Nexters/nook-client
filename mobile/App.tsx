import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef } from 'react';
import { AppState, Linking, Platform, SafeAreaView, StyleSheet } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { takePending } from './modules/nook-share';

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

  // App Group 큐를 읽어(비우고) 실제 공유 항목을 웹으로 전달
  const deliverPending = useCallback(() => {
    const items = takePending();
    if (items.length > 0) {
      postToWeb({ v: 1, type: 'SHARE_RECEIVED', payload: { items } });
    }
  }, [postToWeb]);

  // 백그라운드 → 포그라운드 복귀 시 큐 확인 (콜드스타트는 WEB_READY 에서 처리)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') deliverPending();
    });
    return () => sub.remove();
  }, [deliverPending]);

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
          deliverPending();
          break;
        case 'OPEN_EXTERNAL_URL':
          if (message.payload?.url) Linking.openURL(message.payload.url);
          break;
        default:
          break;
      }
    },
    [deliverPending],
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
