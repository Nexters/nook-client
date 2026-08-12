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
 */
export function useHideBottomMenu() {
  const setHidden = useContext(BottomMenuVisibilityContext)?.setHidden;

  useEffect(() => {
    if (!setHidden) return;
    setHidden(true);
    return () => setHidden(false);
  }, [setHidden]);
}
