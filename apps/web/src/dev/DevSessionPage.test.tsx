import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DevSessionPage, UT_ACCOUNTS } from '@/dev/DevSessionPage';

const establish = vi.fn();
const bridgeState = vi.hoisted(() => ({ isNative: true }));
const sessionState = vi.hoisted(() => ({ status: 'anonymous' as 'anonymous' | 'authenticated' }));
const apiMocks = vi.hoisted(() => ({
  listGroups: vi.fn(),
  createPost: vi.fn(),
}));

vi.mock('@/native-bridge', () => ({
  nativeBridge: bridgeState,
}));

vi.mock('@/features/auth/session/AuthSessionProvider', () => ({
  useAuthSession: () => ({
    status: sessionState.status,
    accessToken: sessionState.status === 'authenticated' ? 'access-token' : null,
    revision: 0,
    establish,
    clear: vi.fn(),
  }),
}));

vi.mock('@/shared/api/generated/endpoints.generated', () => ({
  list: apiMocks.listGroups,
  createPost: apiMocks.createPost,
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/dev/ut']}>
        <Routes>
          <Route path="/dev/ut" element={<DevSessionPage />} />
          <Route path="/" element={<p>앱 진입점</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DevSessionPage', () => {
  beforeEach(() => {
    bridgeState.isNative = true;
    sessionState.status = 'anonymous';
    establish.mockReset();
    establish.mockResolvedValue(undefined);
    apiMocks.listGroups.mockReset();
    apiMocks.createPost.mockReset();
  });

  it('기본 선택된 계정의 토큰으로 세션을 시작한다', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: '이 계정으로 로그인' }));

    await waitFor(() => expect(establish).toHaveBeenCalledWith(UT_ACCOUNTS[0].token, null));
  });

  it('다른 계정을 고르면 그 계정의 토큰을 쓴다', async () => {
    renderPage();

    const account = UT_ACCOUNTS[2];
    fireEvent.change(screen.getByLabelText('테스트 계정'), { target: { value: account.name } });
    fireEvent.click(screen.getByRole('button', { name: '이 계정으로 로그인' }));

    await waitFor(() => expect(establish).toHaveBeenCalledWith(account.token, null));
  });

  it('일반 브라우저에서도 로그인할 수 있다', async () => {
    bridgeState.isNative = false;
    renderPage();

    expect(screen.getByText(/localStorage/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '이 계정으로 로그인' }));

    await waitFor(() => expect(establish).toHaveBeenCalledWith(UT_ACCOUNTS[0].token, null));
  });

  it('앱 진입점으로 돌아간다', () => {
    renderPage();

    fireEvent.click(screen.getByRole('link', { name: '앱으로 이동' }));

    expect(screen.getByText('앱 진입점')).toBeInTheDocument();
  });

  it('아카이브를 다중 선택하고 메모와 함께 게시글을 생성한다', async () => {
    sessionState.status = 'authenticated';
    apiMocks.listGroups.mockResolvedValue({
      resultType: 'SUCCESS',
      success: [
        { id: 1, name: '맛집', color: 'red', postCount: 2 },
        { id: 2, name: '카페', color: 'blue', postCount: 3 },
      ],
    });
    apiMocks.createPost.mockResolvedValue({
      resultType: 'SUCCESS',
      success: { postId: 42, placeParsingStatus: 'PENDING' },
    });
    renderPage();

    fireEvent.click(await screen.findByLabelText(/맛집/));
    fireEvent.click(screen.getByLabelText(/카페/));
    fireEvent.change(screen.getByLabelText('게시글 URL'), {
      target: { value: ' https://example.com/post ' },
    });
    fireEvent.change(screen.getByLabelText(/메모/), {
      target: { value: '테스트 메모' },
    });
    fireEvent.click(screen.getByRole('button', { name: '게시글 생성' }));

    await waitFor(() =>
      expect(apiMocks.createPost).toHaveBeenCalledWith(
        {
          url: 'https://example.com/post',
          memo: '테스트 메모',
          groupIds: [1, 2],
        },
        { auth: 'required' },
      ),
    );
    expect(await screen.findByText(/postId/)).toHaveTextContent('42');
  });
});
