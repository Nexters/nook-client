import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Archive } from '@/features/archive/types';
import { ToastProvider } from '@/shared/toast';
import { ShareSheet } from './ShareSheet';

const profileMock = vi.hoisted(() => vi.fn());
vi.mock('@/features/my/api', () => ({ fetchMyProfile: profileMock }));

vi.mock('@/features/auth/session/AuthSessionProvider', () => ({
  useIsAuthenticated: () => true,
}));

const OWNED_ARCHIVE: Archive = {
  id: 1,
  name: '카페',
  color: 'yellow',
  placeCount: 114,
  accessType: 'OWNED',
};

const SHARED_ARCHIVE: Archive = {
  id: 2,
  name: '지우랑 놀러가고 싶은 곳',
  color: 'cement',
  placeCount: 12,
  accessType: 'SHARED',
  owner: { nickname: 'ehoidi' },
};

function renderSheet(archive: Archive) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ShareSheet open onOpenChange={() => {}} url="https://nook.today/s/abc" archive={archive} />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('ShareSheet', () => {
  beforeEach(() => {
    profileMock.mockReset().mockResolvedValue({ nickname: 'Purr' });
  });

  it('내 아카이브(OWNED)를 공유하면 프리뷰에 내 닉네임이 소유자로 보인다', async () => {
    renderSheet(OWNED_ARCHIVE);
    expect(await screen.findByText(/@Purr/)).toBeInTheDocument();
    expect(screen.getByText(/114 Places/)).toBeInTheDocument();
  });

  it('공유받은 아카이브(SHARED)는 원 소유자 닉네임이 보인다 — 내 프로필로 덮지 않는다', async () => {
    renderSheet(SHARED_ARCHIVE);
    expect(await screen.findByText(/@ehoidi/)).toBeInTheDocument();
    expect(screen.queryByText(/@Purr/)).not.toBeInTheDocument();
  });
});
