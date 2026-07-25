import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
// RN 내장 SafeAreaView 는 deprecated. Expo 권장대로 safe-area-context 를 쓴다.
// Expo Router 를 쓰지 않으므로 Provider 를 직접 감싼다.
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useWebViewBridge } from './src/bridge/useWebViewBridge';

export default function App() {
  const { injectedJavaScript, onMessage, onShouldStartLoadWithRequest, webUrl } =
    useWebViewBridge();

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <WebView
          source={{ uri: webUrl }}
          injectedJavaScriptBeforeContentLoaded={injectedJavaScript}
          onMessage={onMessage}
          // 모든 탐색을 콜백으로 전달하고, 실제 허용 여부는 정확한 URL 판정으로 결정한다.
          originWhitelist={['*']}
          onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
          style={styles.webview}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  webview: { flex: 1 },
});
