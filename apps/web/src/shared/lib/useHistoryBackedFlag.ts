import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * 전체화면 편집·오버레이처럼 "뒤로가기로 닫혀야 하는" UI 상태를 히스토리 엔트리로 승격한다.
 * 열기 = 같은 URL 을 state 와 함께 push, 닫기 = 뒤로가기. 좌상단 버튼·Android 하드웨어
 * 백·iOS 스와이프가 전부 같은 히스토리 동작으로 수렴한다.
 */
export function useHistoryBackedFlag(key: string) {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state ?? null) as Record<string, unknown> | null;
  const on = state?.[key] === true;

  const open = useCallback(() => {
    navigate(location.pathname + location.search, { state: { ...state, [key]: true } });
  }, [navigate, location.pathname, location.search, state, key]);

  const close = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  return [on, open, close] as const;
}
