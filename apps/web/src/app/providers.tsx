import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { NavermapsProvider } from 'react-naver-maps';
import { queryClient } from '@/app/queryClient';
import { env } from '@/shared/config/env';
import { AppShellContainerContext } from '@/shared/lib/app-shell-container';

export function AppProviders({ children }: { children: ReactNode }) {
  const [shellEl, setShellEl] = useState<HTMLDivElement | null>(null);
  return (
    <AppShellContainerContext.Provider value={shellEl}>
      <div
        ref={setShellEl}
        className="mx-auto min-h-dvh w-full overflow-hidden bg-gray-0 will-change-transform max-w-[450px]"
      >
        <QueryClientProvider client={queryClient}>
          <NavermapsProvider ncpKeyId={env.naverMapClientId}>{children}</NavermapsProvider>
        </QueryClientProvider>
      </div>
    </AppShellContainerContext.Provider>
  );
}
