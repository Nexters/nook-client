import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useWebViewBridge } from './src/bridge/useWebViewBridge';

export default function App() {
  const {
    bootstrapped,
    injectedJavaScript,
    onMessage,
    onShouldStartLoadWithRequest,
    webUrl,
    webViewKey,
    webViewRef,
  } = useWebViewBridge();

  return (
    <View style={styles.container}>
      {/* WebView를 상태바 뒤까지 확장한다. 실제 콘텐츠 여백은 웹의 safe-area CSS가 담당한다. */}
      <StatusBar style="dark" />
      {bootstrapped ? (
        <WebView
          key={webViewKey}
          ref={webViewRef}
          source={{ uri: webUrl }}
          injectedJavaScriptBeforeContentLoaded={injectedJavaScript}
          onMessage={onMessage}
          // 모든 탐색을 콜백으로 전달하고, 실제 허용 여부는 정확한 URL 판정으로 결정한다.
          originWhitelist={['*']}
          onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
          // 웹의 navigator.geolocation 을 프록시한다. Android 전용 prop — iOS(WKWebView)는
          // Info.plist 의 NSLocationWhenInUseUsageDescription 만으로 자체 처리한다.
          geolocationEnabled
          // iOS 엣지 스와이프 뒤로가기. SPA 의 pushState 히스토리도 WKWebView 백리스트에
          // 쌓이므로 라우트·히스토리 승격된 오버레이 모두 제스처로 닫힌다. iOS 전용 prop.
          allowsBackForwardNavigationGestures
          // dev 서버 번들은 URL 이 그대로라 WebView 캐시에 남는다 — 코드를 고쳐도 옛 모듈이
          // 섞여 실행되면서(지도 스크립트 컨텍스트가 null 이 되는 등) 재현 불가한 오류를 만든다.
          cacheEnabled={!__DEV__}
          style={styles.webview}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  webview: { flex: 1 },
});
