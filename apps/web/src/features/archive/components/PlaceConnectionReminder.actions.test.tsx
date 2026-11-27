import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/shared/toast';
import { readReminderHiddenUntil } from '../lib/reminderDismissal';
import { PlaceConnectionReminder } from './PlaceConnectionReminder';

const state = vi.hoisted(() => ({ enabled: true }));
vi.mock('@/features/auth/session/AuthSessionProvider', () => ({ useIsAuthenticated: () => true }));
vi.mock('@/shared/api', async (original) => ({
  ...(await original<typeof import('@/shared/api')>()),
  get2: async () => ({
    resultType: 'SUCCESS',
    success: { enabled: state.enabled, showBanner: state.enabled, unlinkedPostCount: 2 },
  }),
  list1: async () => ({ resultType: 'SUCCESS', success: { items: [], hasNext: false } }),
  update1: async ({ enabled }: { enabled: boolean }) => {
    state.enabled = enabled;
    return {};
  },
}));
beforeEach(() => {
  localStorage.clear();
  state.enabled = true;
});

function openBanner() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ToastProvider>
          <PlaceConnectionReminder />
        </ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

it('X는 토스트 없이 24시간 숨기며 설정은 변경하지 않는다', async () => {
  openBanner();
  fireEvent.click(await screen.findByRole('button', { name: '미연결 게시물 안내 닫기' }));
  expect(screen.queryByText('24시간 동안 표시하지 않아요.')).not.toBeInTheDocument();
  expect(readReminderHiddenUntil()).toBeGreaterThan(Date.now() + 23 * 60 * 60 * 1000);
  expect(state.enabled).toBe(true);
  expect(screen.queryByRole('button', { name: '미연결 게시물 안내 닫기' })).not.toBeInTheDocument();
  expect(document.querySelector('[data-visible="false"]')).toBeInTheDocument();
});

it('다시 보지 않음은 설정을 끄고 취소하면 다시 켠다', async () => {
  openBanner();
  fireEvent.click(await screen.findByRole('button', { name: '다시 보지 않음' }));
  expect(await screen.findByText('마이페이지> 설정에서 다시 킬 수 있어요.')).toBeInTheDocument();
  expect(state.enabled).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: '취소' }));
  await waitFor(() => expect(state.enabled).toBe(true));
  expect(await screen.findByRole('button', { name: '다시 보지 않음' })).toBeInTheDocument();
});
