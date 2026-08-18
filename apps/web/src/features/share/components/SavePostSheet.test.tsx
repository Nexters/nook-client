import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Archive } from '@/features/archive/types';
import { SavePostSheet } from './SavePostSheet';

const archivesMock = vi.hoisted(() => vi.fn());
vi.mock('@/features/archive/api', () => ({ fetchArchives: archivesMock }));

// Mock useIsAuthenticated to return true so useArchives will fetch
vi.mock('@/features/auth/session/AuthSessionProvider', () => ({
  useIsAuthenticated: () => true,
}));

const MY_ARCHIVES: Archive[] = [
  { id: 1, name: '카페', color: 'yellow', placeCount: 3, accessType: 'OWNED' },
  { id: 2, name: '토요일 모임 장소', color: 'blue', placeCount: 1, accessType: 'OWNED' },
  {
    id: 3,
    name: '지우랑 놀러가고 싶은 곳',
    color: 'cement',
    placeCount: 12,
    accessType: 'SHARED',
    owner: { nickname: 'ehoidi' },
  },
];

function renderSheet(onSave = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <SavePostSheet open onOpenChange={() => {}} onSave={onSave} pending={false} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return onSave;
}

describe('SavePostSheet', () => {
  beforeEach(() => {
    archivesMock.mockReset().mockResolvedValue(MY_ARCHIVES);
  });

  it('내 아카이브(OWNED)만 목록에 보여준다 — 공유받은 아카이브에는 저장할 수 없다', async () => {
    renderSheet();
    expect(await screen.findByText('카페')).toBeInTheDocument();
    expect(screen.queryByText('지우랑 놀러가고 싶은 곳')).not.toBeInTheDocument();
  });

  it('아카이브를 고르기 전에는 저장하기가 비활성이고, 고르면 선택과 메모를 담아 저장한다', async () => {
    const onSave = renderSheet();
    const submit = await screen.findByRole('button', { name: '저장하기' });
    expect(submit).toBeDisabled();

    // Wait for archives to load
    await screen.findByText('카페');
    fireEvent.click(screen.getByText('카페'));
    fireEvent.click(screen.getByText('토요일 모임 장소'));
    fireEvent.change(screen.getByPlaceholderText('추가로 메모하고 싶은 내용이 있나요?'), {
      target: { value: '지우랑 가면 좋겠다' },
    });
    fireEvent.click(submit);

    expect(onSave).toHaveBeenCalledWith({ groupIds: [1, 2], memo: '지우랑 가면 좋겠다' });
  });
});
