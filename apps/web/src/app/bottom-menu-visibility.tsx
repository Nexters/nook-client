import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';

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
