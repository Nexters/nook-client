import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { BottomMenuVisibilityProvider } from '@/app/bottom-menu-visibility';
import { ArchiveDetailPage } from '@/features/archive/ArchiveDetailPage';
import { ArchivePage } from '@/features/archive/ArchivePage';
import { AuthSessionProvider } from '@/features/auth/session/AuthSessionProvider';
import { SharedPostSharePage } from '@/features/share/SharedPostSharePage';
import { ToastProvider } from '@/shared/toast';
import { localPrototypeRequest } from './local-prototype';

vi.mock('@/shared/config/env', async (original) => {
  const actual = await original<typeof import('@/shared/config/env')>();
  return { env: { ...actual.env, localPrototype: true } };
});

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

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

it('opens only the reminder fixture posts from the archive banner', async () => {
  sessionStorage.setItem('nook.prototype.reminder', '2');
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <AuthSessionProvider>
        <ToastProvider>
          <BottomMenuVisibilityProvider value={{ hidden: false, setHidden: () => {} }}>
            <MemoryRouter initialEntries={['/archive']}>
              <ArchivePage />
            </MemoryRouter>
          </BottomMenuVisibilityProvider>
        </ToastProvider>
      </AuthSessionProvider>
    </QueryClientProvider>,
  );
  expect(await screen.findByText('2개')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '게시물 보기' }));
  expect(await screen.findByRole('dialog', { name: '장소 없는 게시물' })).toBeInTheDocument();
  expect(screen.getAllByText('0 Places')).toHaveLength(2);
});

it('offers the existing action toast and restores reminder settings on cancel', async () => {
  sessionStorage.setItem('nook.prototype.reminder', '2');
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <AuthSessionProvider>
        <ToastProvider>
          <BottomMenuVisibilityProvider value={{ hidden: false, setHidden: () => {} }}>
            <MemoryRouter initialEntries={['/archive']}>
              <ArchivePage />
            </MemoryRouter>
          </BottomMenuVisibilityProvider>
        </ToastProvider>
      </AuthSessionProvider>
    </QueryClientProvider>,
  );
  fireEvent.click(await screen.findByRole('button', { name: '다시 보지 않음' }));
  expect(await screen.findByText('설정에서 언제든지 변경할 수 있어요')).toBeInTheDocument();
  await waitFor(() =>
    expect(
      screen.queryByRole('region', { name: '장소 미연결 게시물 안내' }),
    ).not.toBeInTheDocument(),
  );
  fireEvent.click(screen.getByRole('button', { name: '취소' }));
  expect(
    await screen.findByRole('region', { name: '장소 미연결 게시물 안내' }),
  ).toBeInTheDocument();
});

it('opens a single-post share and saves its places into an owned archive', async () => {
  const result = await localPrototypeRequest('/api/v1/posts/1/share-links', { method: 'POST' });
  const token = (result.success as { token: string }).token;
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <AuthSessionProvider>
        <ToastProvider>
          <BottomMenuVisibilityProvider value={{ hidden: false, setHidden: () => {} }}>
            <MemoryRouter initialEntries={[`/shared-post/${token}`]}>
              <Routes>
                <Route path="/shared-post/:token" element={<SharedPostSharePage />} />
                <Route path="/post/:postId" element={<p>내 게시물 상세</p>} />
              </Routes>
            </MemoryRouter>
          </BottomMenuVisibilityProvider>
        </ToastProvider>
      </AuthSessionProvider>
    </QueryClientProvider>,
  );
  fireEvent.click(await screen.findByRole('button', { name: '아카이브에 저장' }));
  fireEvent.click(await screen.findByRole('checkbox', { name: '다음에 같이 가요' }));
  fireEvent.click(screen.getByRole('button', { name: '저장하기' }));
  expect(await screen.findByText('내 게시물 상세')).toBeInTheDocument();
});
