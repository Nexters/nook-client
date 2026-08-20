import { useEffect } from 'react';

/**
 * "이 화면은 iOS 좌측 엣지 스와이프 뒤로가기를 허용한다"는 선언을 모으는 레지스트리.
 *
 * 셸의 제스처는 WebView 전역 prop(`allowsBackForwardNavigationGestures`)이라 웹에서
 * 화면별로 막을 수 없다. 대신 "지금 화면이 스와이프해도 되는 화면인가"는 웹만 알 수
 * 있으므로, 그 판정을 여기서 모아 셸에 알린다(전송은 app 레이어 — 아래 참고).
 *
 * 판정 기준은 제품 규칙 그대로 **헤더 좌상단에 뒤로가기 버튼이 있는가** 하나다. 그래서
 * 공용 `BackButton` 이 마운트되어 있는 동안 자동으로 켜진다 — 화면 목록을 따로 들고
 * 다닐 필요가 없고, 드로어·바텀시트·메인 탭은 그 버튼을 쓰지 않아 저절로 빠진다
 * (예: `PlaceSheet` 의 스티키 헤더는 의도적으로 raw 버튼이다).
 * 공용 버튼을 못 쓰는 전체화면 오버레이는 `AllowBackGesture` 로 직접 선언한다.
 *
 * 브리지 전송은 `app/native-back` 이 맡는다 — shared 는 네이티브 브리지를 모른다
 * (`backInterceptors` 와 같은 구조: 등록은 shared, 디스패치는 app).
 */

type Listener = (enabled: boolean) => void;

let allowCount = 0;
let listener: Listener | null = null;
/** 마지막으로 알린 값. 같은 값을 두 번 보내지 않는다. */
let notified: boolean | null = null;
let scheduled = false;

function flush() {
  scheduled = false;
  const enabled = allowCount > 0;
  if (enabled === notified) return;
  notified = enabled;
  listener?.(enabled);
}

/**
 * 라우트가 바뀌면 이전 화면의 해제와 새 화면의 등록이 같은 커밋에서 함께 일어난다 —
 * 그 사이 0 을 스쳐 지나가므로, 마이크로태스크 하나를 미뤄 최종값만 알린다.
 * 안 미루면 상세 → 상세 이동마다 껐다 켜는 메시지가 한 쌍씩 나간다.
 */
function schedule() {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(flush);
}

/** 변화를 구독한다. 구독 즉시 현재 값을 한 번 받는다. 반환한 함수로 해제한다. */
export function onBackGestureChange(next: Listener): () => void {
  listener = next;
  notified = null;
  schedule();
  return () => {
    if (listener === next) listener = null;
  };
}

/** 마운트되어 있는 동안 이 화면에서 좌측 스와이프 뒤로가기를 허용한다. */
export function useAllowBackGesture(): void {
  useEffect(() => {
    allowCount += 1;
    schedule();
    return () => {
      allowCount -= 1;
      schedule();
    };
  }, []);
}

/**
 * `useAllowBackGesture` 의 선언형 버전 — 조건부 JSX 안에 그대로 놓을 수 있다.
 * 공용 `BackButton` 을 못 쓰는 전체화면 오버레이(사진 뷰어 등)에서 쓴다.
 */
export function AllowBackGesture(): null {
  useAllowBackGesture();
  return null;
}

/** 테스트 전용 — 모듈 전역 상태를 초기화한다. */
export function resetBackGestureForTest(): void {
  allowCount = 0;
  listener = null;
  notified = null;
  scheduled = false;
}
