import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BottomMenuVisibilityProvider } from '@/app/bottom-menu-visibility';
import type { Group } from '@/features/group/types';
import type { MyProfile } from '@/features/my/api';
import { MyPage } from '@/features/my/MyPage';

const PROFILE: MyProfile = { id: 1, nickname: '졸림핑', profileImageUrl: null };
const GROUPS: Group[] = [
  { id: 1, name: '카페', color: 'yellow', placeCount: 30 },
  { id: 2, name: '독립영화관', color: 'blue', placeCount: 2 },
];

// HTTP 전송이 아니라 화면 ↔ Query ↔ feature API 배선만 검증한다.
const mocks = vi.hoisted(() => ({
  fetchMyProfile: vi.fn(),
  requestLogout: vi.fn(),
  fetchGroups: vi.fn(),
  clearSession: vi.fn(),
  requestImagePick: vi.fn(),
  isNative: true,
}));

vi.mock('@/features/my/api', () => ({
  fetchMyProfile: mocks.fetchMyProfile,
  requestLogout: mocks.requestLogout,
}));
vi.mock('@/features/group/api', () => ({ fetchGroups: mocks.fetchGroups }));
vi.mock('@/features/auth/session/AuthSessionProvider', () => ({
  useAuthSession: () => ({
    status: 'authenticated',
    accessToken: 'token',
    revision: 1,
    establish: vi.fn(),
    clear: mocks.clearSession,
  }),
}));
vi.mock('@/native-bridge', () => ({
  nativeBridge: {
    get isNative() {
      return mocks.isNative;
    },
    requestImagePick: mocks.requestImagePick,
  },
}));

function renderMyPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const setHidden = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <BottomMenuVisibilityProvider value={{ hidden: false, setHidden }}>
          <MyPage />
        </BottomMenuVisibilityProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { setHidden };
}

describe('MyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchMyProfile.mockResolvedValue(PROFILE);
    mocks.fetchGroups.mockResolvedValue(GROUPS);
    mocks.requestLogout.mockResolvedValue(undefined);
    mocks.clearSession.mockResolvedValue(undefined);
  });

  it('내 정보와 그룹·저장 개수, 앱 메뉴를 렌더한다', async () => {
    renderMyPage();

    expect(await screen.findByText('졸림핑')).toBeInTheDocument();
    expect(await screen.findByText('Group 2 · Save 32')).toBeInTheDocument();
    expect(screen.getByText('로그인 정보')).toBeInTheDocument();
    expect(screen.getByText('개인정보 처리방침')).toBeInTheDocument();
    expect(screen.getByText('이용약관')).toBeInTheDocument();
    expect(screen.getByText('문의하기')).toBeInTheDocument();
  });

  it('내 정보를 불러오지 못하면 안내 문구를 보여준다', async () => {
    mocks.fetchMyProfile.mockRejectedValue(new Error('network'));
    renderMyPage();

    expect(await screen.findByText('내 정보를 불러오지 못했어요')).toBeInTheDocument();
  });

  it('회원 정보를 편집하고 저장한다', async () => {
    const { setHidden } = renderMyPage();

    fireEvent.click(await screen.findByText('졸림핑'));
    expect(screen.getByText('회원 정보')).toBeInTheDocument();
    expect(setHidden).toHaveBeenLastCalledWith(true);

    const nicknameInput = screen.getByRole('textbox', { name: '닉네임' });
    expect(nicknameInput).toHaveValue('졸림핑');
    fireEvent.change(nicknameInput, { target: { value: 'new nook' } });
    fireEvent.click(screen.getByRole('button', { name: '저장하기' }));

    expect(screen.getByText('new nook')).toBeInTheDocument();
    expect(setHidden).toHaveBeenLastCalledWith(false);
  });

  it('로그아웃을 확인하면 서버 로그아웃 후 세션을 지운다', async () => {
    renderMyPage();
    await screen.findByText('졸림핑');

    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }));
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveTextContent('로그아웃 하시겠어요?');
    fireEvent.click(within(dialog).getByRole('button', { name: '로그아웃' }));

    await waitFor(() => expect(mocks.clearSession).toHaveBeenCalled());
    expect(mocks.requestLogout).toHaveBeenCalled();
  });

  it('서버 로그아웃이 실패해도 세션을 지운다', async () => {
    mocks.requestLogout.mockRejectedValue(new Error('expired'));
    renderMyPage();
    await screen.findByText('졸림핑');

    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }));
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: '로그아웃' }),
    );

    await waitFor(() => expect(mocks.clearSession).toHaveBeenCalled());
  });

  it('프로필 이미지 시트에서 앨범을 고르면 미리보기를 갱신한다', async () => {
    mocks.requestImagePick.mockResolvedValue({
      requestId: 'r1',
      source: 'album',
      status: 'success',
      image: { base64: 'aGk=', mimeType: 'image/png', width: 600, height: 600 },
    });
    renderMyPage();

    fireEvent.click(await screen.findByText('졸림핑'));
    fireEvent.click(screen.getByRole('button', { name: '프로필 이미지 변경' }));
    expect(screen.getByText('직접 촬영하기')).toBeInTheDocument();

    fireEvent.click(screen.getByText('앨범에서 선택'));
    expect(mocks.requestImagePick).toHaveBeenCalledWith('album');
    await waitFor(() => {
      expect(screen.getByAltText('프로필 이미지')).toHaveAttribute(
        'src',
        'data:image/png;base64,aGk=',
      );
    });
  });

  it('픽커를 취소하면 미리보기를 그대로 둔다', async () => {
    mocks.requestImagePick.mockResolvedValue({
      requestId: 'r1',
      source: 'camera',
      status: 'cancelled',
    });
    renderMyPage();

    fireEvent.click(await screen.findByText('졸림핑'));
    const before = screen.getByAltText('프로필 이미지').getAttribute('src');
    fireEvent.click(screen.getByRole('button', { name: '프로필 이미지 변경' }));
    fireEvent.click(screen.getByText('직접 촬영하기'));

    await waitFor(() => expect(mocks.requestImagePick).toHaveBeenCalledWith('camera'));
    expect(screen.getByAltText('프로필 이미지')).toHaveAttribute('src', before ?? '');
  });

  it('탈퇴 확인 팝업을 연다', async () => {
    renderMyPage();
    await screen.findByText('졸림핑');

    fireEvent.click(screen.getByRole('button', { name: '탈퇴하기' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('탈퇴하시겠어요?');
  });
});
