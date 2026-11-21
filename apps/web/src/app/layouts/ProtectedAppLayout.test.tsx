import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import * as profileApi from '@/features/my/api';
import { myQueryKeys } from '@/features/my/api/queries';
import { ProtectedAppLayout } from './ProtectedAppLayout';

vi.mock('@/features/auth/session/AuthSessionProvider', () => ({
  useIsAuthenticated: () => true,
}));
vi.mock('@/features/post/components/ArchiveJumpPopover', () => ({
  ArchiveJumpHost: () => null,
}));

it('updates the My tab when a saved profile photo enters the shared cache', async () => {
  const profile = { id: 1, nickname: '문지우', provider: 'KAKAO', profileImageUrl: null } as const;
  const fetchProfile = vi.spyOn(profileApi, 'fetchMyProfile').mockResolvedValue(profile);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const photo = 'https://cdn.example.com/profile.jpg';

  try {
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/map']}>
          <ProtectedAppLayout />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const myTab = screen.getByRole('link', { name: 'my' });
    expect(myTab.querySelector('img')).toBeNull();
    await waitFor(() => expect(client.getQueryData(myQueryKeys.profile)).toEqual(profile));

    act(() => {
      client.setQueryData(myQueryKeys.profile, { ...profile, profileImageUrl: photo });
    });

    await waitFor(() => expect(myTab.querySelector('img')).toHaveAttribute('src', photo));
    fireEvent.click(myTab);
    expect(myTab).toHaveAttribute('aria-current', 'page');
    expect(myTab.querySelector('img')).toHaveAttribute('src', photo);

    const image = myTab.querySelector('img');
    if (image) fireEvent.error(image);
    expect(myTab.querySelector('img')).toBeNull();
  } finally {
    fetchProfile.mockRestore();
  }
});
