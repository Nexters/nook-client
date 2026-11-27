import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { BottomMenuVisibilityProvider } from '@/app/bottom-menu-visibility';
import { ArchiveDetailPage } from '@/features/archive/ArchiveDetailPage';
import { AuthSessionProvider } from '@/features/auth/session/AuthSessionProvider';
import { ToastProvider } from '@/shared/toast';

vi.mock('@/shared/config/env', async (original) => {
  const actual = await original<typeof import('@/shared/config/env')>();
  return { env: { ...actual.env, localPrototype: true } };
});
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
function openArchive(id = 1) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <AuthSessionProvider>
        <ToastProvider>
          <BottomMenuVisibilityProvider value={{ hidden: false, setHidden: () => {} }}>
            <MemoryRouter initialEntries={[`/archive/${id}`]}>
              <Routes>
                <Route path="/archive/:archiveId" element={<ArchiveDetailPage />} />
              </Routes>
            </MemoryRouter>
          </BottomMenuVisibilityProvider>
        </ToastProvider>
      </AuthSessionProvider>
    </QueryClientProvider>,
  );
}
it('applies each view through the menu and remembers it only in that archive', async () => {
  const page = openArchive();
  await screen.findByRole('heading', { name: '커피 한 잔의 여유' });
  await screen.findAllByText('오후의 커피');
  fireEvent.click(screen.getByRole('button', { name: '더보기' }));
  fireEvent.click(screen.getByRole('menuitem', { name: '아카이브 필터' }));
  fireEvent.click(await screen.findByRole('radio', { name: '피드형' }));
  fireEvent.click(screen.getByRole('button', { name: '적용하기' }));
  await waitFor(() =>
    expect(page.container.querySelector('[data-view="feed"]')).toBeInTheDocument(),
  );
  expect(JSON.parse(localStorage.getItem('nook.archive-view.v1.1') ?? '{}')).toEqual({
    view: 'feed',
    sort: 'LATEST',
  });
  page.unmount();
  const second = openArchive(2);
  await screen.findByRole('heading', { name: '다음에 같이 가요' });
  await waitFor(() =>
    expect(second.container.querySelector('[data-view="grid"]')).toBeInTheDocument(),
  );
});
