import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useWebViewBridge } from './src/bridge/useWebViewBridge';
import { NetworkErrorView } from './src/webview/NetworkErrorView';

// 웹이 첫 화면을 그리기 전까지 스플래시를 붙잡아 둔다. 컴포넌트 밖에서 불러야 첫 렌더 전에 적용된다.
void SplashScreen.preventAutoHideAsync();

/** 웹이 응답하지 않아도 스플래시에 갇히지 않게 하는 상한. */
const SPLASH_TIMEOUT_MS = 10_000;

export default function App() {
  const {
    bootstrapped,
    webReady,
    loadFailed,
    onLoadFailed,
    retryLoad,
    injectedJavaScript,
    onMessage,
    onShouldStartLoadWithRequest,
    backGestureEnabled,
    webUrl,
    webViewKey,
    webViewRef,
  } = useWebViewBridge();

  // 웹이 그려졌거나(webReady) 오류 화면을 띄울 수 있게 되면(loadFailed) 스플래시를 내린다.
  useEffect(() => {
    if (!webReady && !loadFailed) return;
    void SplashScreen.hideAsync();
  }, [webReady, loadFailed]);

  useEffect(() => {
    const timer = setTimeout(() => void SplashScreen.hideAsync(), SPLASH_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

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
          // 연결이 없거나 웹을 못 받아오면 흰 화면 대신 안내를 띄운다.
          onError={onLoadFailed}
          // 메인 문서가 5xx 로 떨어진 경우만 오류로 본다 — 하위 리소스·SPA 라우트는 웹이 처리한다.
          onHttpError={({ nativeEvent }) => {
            if (nativeEvent.url === webUrl && nativeEvent.statusCode >= 500) onLoadFailed();
          }}
          // 웹의 navigator.geolocation 을 프록시한다. Android 전용 prop — iOS(WKWebView)는
          // Info.plist 의 NSLocationWhenInUseUsageDescription 만으로 자체 처리한다.
          geolocationEnabled
          // iOS 엣지 스와이프 뒤로가기. SPA 의 pushState 히스토리도 WKWebView 백리스트에
          // 쌓이므로 라우트·히스토리 승격된 오버레이 모두 제스처로 닫힌다. iOS 전용 prop.
          //
          // 화면 단위로 켜고 끈다 — 이 prop 은 WebView 전역이라 웹에서 직접 막을 수 없어,
          // "헤더 좌상단에 뒤로가기 버튼이 있는 풀 페이지인가"라는 판정만 웹이 내려
          // SET_BACK_GESTURE 로 보내준다(제품 규칙). 드로어·바텀시트·메인 탭에서는 false 다.
          allowsBackForwardNavigationGestures={backGestureEnabled}
          // iOS 전용. 기본값이 NO 라 WKWebView 가 <video playsinline> 을 무시하고, 재생이 시작되는
          // 순간 네이티브 전체화면 플레이어로 넘긴다 — 게시물 상세의 인라인 영상 프레임이 통째로
          // 깨진다(react-native-webview 가 이 ivar 만 init 에서 초기화하지 않는다). Android 는 no-op.
          allowsInlineMediaPlayback
          // 시안의 기본 상태가 muted 자동재생이다. 기본값(true)이면 사용자 제스처 없이는 시작되지
          // 않아 정지 프레임에서 멈춘다.
          mediaPlaybackRequiresUserAction={false}
          // Android 는 스크롤 끝에서 글로우와 함께 화면 전체를 밀어낸다 — 웹은 헤더·바텀이 고정이라
          // 그 영역까지 딸려 움직인다. iOS 는 bounces 를 끄면 안쪽 스크롤의 러버밴드까지 죽어
          // 스크롤이 뻣뻣해지므로, 웹에서 문서를 뷰포트에 붙박는 방식으로 대신 막는다(global.css).
          overScrollMode="never"
          // dev 서버 번들은 URL 이 그대로라 WebView 캐시에 남는다 — 코드를 고쳐도 옛 모듈이
          // 섞여 실행되면서(지도 스크립트 컨텍스트가 null 이 되는 등) 재현 불가한 오류를 만든다.
          cacheEnabled={!__DEV__}
          // iOS 16.4+ 는 이 플래그가 있어야 Mac Safari 개발자 메뉴에서 WebView 를 검사할 수 있다
          // (Android 크롬 inspect 대응). 스토어 빌드에서 열리지 않게 dev 번들에서만 켠다.
          webviewDebuggingEnabled={__DEV__}
          style={styles.webview}
        />
      ) : null}
      {/* WebView 가 그리는 기본 오류 페이지를 덮는다. */}
      {loadFailed ? <NetworkErrorView onRetry={retryLoad} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // 스플래시와 같은 배경이라 웹이 그려지기 전 잠깐 비쳐도 색이 튀지 않는다.
  container: { flex: 1, backgroundColor: '#f4f5f7' },
  webview: { flex: 1 },
});
