import type { ReactNode } from 'react';
import { createContext, useContext, useEffect } from 'react';

interface BottomMenuVisibilityValue {
  hidden: boolean;
  setHidden: (hidden: boolean) => void;
}

const BottomMenuVisibilityContext = createContext<BottomMenuVisibilityValue | null>(null);

export function BottomMenuVisibilityProvider({
  value,
  children,
}: {
  value: BottomMenuVisibilityValue;
  children: ReactNode;
}) {
  return (
    <BottomMenuVisibilityContext.Provider value={value}>
      {children}
    </BottomMenuVisibilityContext.Provider>
  );
}

export function useBottomMenuVisibility() {
  const context = useContext(BottomMenuVisibilityContext);
  if (!context) {
    throw new Error('useBottomMenuVisibility must be used within BottomMenuVisibilityProvider');
  }
  return context;
}

/**
 * 마운트되어 있는 동안 하단 탭바를 숨긴다 (탭 밖의 전체화면 상세/폼 라우트용).
 * 약관처럼 로그인 밖 라우트에도 쓰이므로, 탭바 자체가 없으면 아무것도 하지 않는다.
 *
 * 탭 위에 얹는 오버레이는 숨기는 대신 탭바보다 위로 덮는 편이 낫다 — 숨기면 오버레이가
 * 사라진 다음에야 탭바가 뒤늦게 올라온다. 그런 화면은 `enabled` 를 false 로 넘긴다.
 */
export function useHideBottomMenu(enabled = true) {
  const setHidden = useContext(BottomMenuVisibilityContext)?.setHidden;

  useEffect(() => {
    if (!setHidden || !enabled) return;
    setHidden(true);
    return () => setHidden(false);
  }, [setHidden, enabled]);
}
