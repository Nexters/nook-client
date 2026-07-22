import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { queryClient } from '@/app/queryClient';

/**
 * 전역 프로바이더 컴포지션. 새 전역 컨텍스트(테마 등)는 여기에 추가한다.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
