import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { BottomMenuVisibilityProvider } from '@/app/bottom-menu-visibility';
import { ArchiveDetailPage } from '@/features/archive/ArchiveDetailPage';
import { ArchivePage } from '@/features/archive/ArchivePage';
import { AuthSessionProvider } from '@/features/auth/session/AuthSessionProvider';
import { ToastProvider } from '@/shared/toast';

vi.mock('@/shared/config/env', async (original) => {
  const actual = await original<typeof import('@/shared/config/env')>();
  return { env: { ...actual.env, localPrototype: true } };
});

beforeEach(() => localStorage.clear());

it('shows the current archive components with local data and opens their real detail page', async () => {
  const fetcher = vi.spyOn(globalThis, 'fetch');
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <AuthSessionProvider>
        <ToastProvider>
          <BottomMenuVisibilityProvider value={{ hidden: false, setHidden: () => {} }}>
            <MemoryRouter initialEntries={['/archive']}>
              <Routes>
                <Route path="/archive" element={<ArchivePage />} />
                <Route path="/archive/:archiveId" element={<ArchiveDetailPage />} />
              </Routes>
            </MemoryRouter>
          </BottomMenuVisibilityProvider>
        </ToastProvider>
      </AuthSessionProvider>
    </QueryClientProvider>,
  );
  const archive = await screen.findByText('커피 한 잔의 여유');
  expect(await screen.findByText('다음에 같이 가요')).toBeInTheDocument();
  expect(await screen.findByText('취향을 찾아서')).toBeInTheDocument();
  fireEvent.click(archive);
  expect((await screen.findAllByText('오후의 커피')).length).toBeGreaterThan(0);
  expect(fetcher).not.toHaveBeenCalled();
  fetcher.mockRestore();
});
