import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { nativeBridge } from '@/native-bridge';
import { onBackGestureChange } from '@/shared/lib/backGesture';
import { runBackInterceptors } from '@/shared/lib/backInterceptors';

/**
 * 네이티브 뒤로가기(Android 하드웨어 버튼)를 웹의 단일 동작으로 수렴시킨다.
 *
 * 처리 순서:
 * 1. 인터셉터 — 히스토리 뒤로가기와 목적지가 다른 화면(공유 진입 게시물 등)이 등록한다.
 * 2. 히스토리 뒤로 — 라우트 이동과 히스토리 승격된 오버레이가 여기서 닫힌다.
 * 3. 둘 다 없으면 BACK_EXHAUSTED — 셸이 OS 기본 동작(앱 내리기)을 한다.
 *
 * iOS 엣지 스와이프는 WKWebView 가 히스토리를 직접 조작하므로 이 모듈을 거치지 않는다 —
 * 그래서 "뒤로가기로 닫혀야 하는" 상태는 반드시 히스토리에 승격돼 있어야 한다.
 *
 * 그 제스처를 화면 단위로 켜고 끄는 것도 여기서 중계한다(`useBackGestureBridge`) —
 * 판정은 `shared/lib/backGesture` 가 모으고, 셸에 알리는 건 브리지를 아는 이 레이어다.
 */

function useNativeBackBridge(): void {
  const navigate = useNavigate();

  useEffect(() => {
    if (!nativeBridge.isNative) return undefined;
    return nativeBridge.on((message) => {
      if (message.type !== 'BACK_REQUESTED') return;

      if (runBackInterceptors()) return;

      // react-router 데이터 라우터가 히스토리 엔트리마다 idx 를 심는다. 0 이면 첫 화면.
      const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
      if (idx > 0) {
        navigate(-1);
        return;
      }

      nativeBridge.send({ v: 1, type: 'BACK_EXHAUSTED', payload: {} });
    });
  }, [navigate]);
}

/**
 * 지금 화면이 좌측 엣지 스와이프를 허용하는지 셸에 알린다.
 *
 * 셸의 `allowsBackForwardNavigationGestures` 는 WebView 전역이라 웹에서 화면별로 막을
 * 수 없다 — 대신 "헤더 좌상단에 뒤로가기 버튼이 있는가"라는 판정만 웹이 내려 보낸다.
 * 이 메시지를 모르는 구버전 셸은 파서에서 걸러 무시하므로 웹만 먼저 배포해도 안전하다.
 */
function useBackGestureBridge(): void {
  useEffect(() => {
    if (!nativeBridge.isNative) return undefined;
    return onBackGestureChange((enabled) => {
      nativeBridge.send({ v: 1, type: 'SET_BACK_GESTURE', payload: { enabled } });
    });
  }, []);
}

/** 라우터 루트 요소 — 모든 라우트에서 네이티브 뒤로가기를 받는다. */
export function NativeBackHost() {
  useNativeBackBridge();
  useBackGestureBridge();
  return <Outlet />;
}
