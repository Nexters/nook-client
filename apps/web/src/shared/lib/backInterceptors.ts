import { useCallback, useEffect } from 'react';

/**
 * 네이티브 뒤로가기(Android 백 버튼)를 히스토리 뒤로 대신 가로채는 인터셉터 레지스트리.
 * 열린 시트 닫기, 공유 진입 화면의 커스텀 목적지처럼 "뒤로 ≠ 히스토리"인 경우에 쓴다.
 * 디스패치는 app/native-back 이 한다. iOS 엣지 스와이프는 WKWebView 가 히스토리를
 * 직접 조작하므로 여기 걸리지 않는다.
 */

export type BackInterceptor = () => boolean;

const interceptors: BackInterceptor[] = [];

/** 반환한 함수로 해제한다. 나중에 등록된 인터셉터가 먼저 실행된다. */
export function registerBackInterceptor(interceptor: BackInterceptor): () => void {
  interceptors.push(interceptor);
  return () => {
    const index = interceptors.lastIndexOf(interceptor);
    if (index >= 0) interceptors.splice(index, 1);
  };
}

/** 하나라도 처리하면 true. */
export function runBackInterceptors(): boolean {
  for (const interceptor of [...interceptors].reverse()) {
    if (interceptor()) return true;
  }
  return false;
}

/** 화면 단위 등록용. null 을 주면 등록하지 않는다 — 조건부 인터셉트에 쓴다. */
export function useBackInterceptor(interceptor: BackInterceptor | null): void {
  useEffect(() => (interceptor ? registerBackInterceptor(interceptor) : undefined), [interceptor]);
}

/** 열림 상태인 시트·다이얼로그를 뒤로가기로 닫는다 — Android 관례. */
export function useCloseOnBack(open: boolean | undefined, close: (() => void) | null): void {
  useBackInterceptor(
    useCallback(() => {
      if (!open || !close) return false;
      close();
      return true;
    }, [open, close]),
  );
}
