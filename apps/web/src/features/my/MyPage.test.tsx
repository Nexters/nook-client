import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BottomMenuVisibilityProvider } from '@/app/bottom-menu-visibility';
import type { Group } from '@/features/group/types';
import type { MyProfile } from '@/features/my/api';
import { ContactPage } from '@/features/my/ContactPage';
import { MyPage } from '@/features/my/MyPage';
import { PrivacyPolicyPage } from '@/features/my/policy/PrivacyPolicyPage';
import { TermsPage } from '@/features/my/policy/TermsPage';
import { ToastProvider } from '@/shared/toast';

const PROFILE: MyProfile = { id: 1, nickname: '졸림핑', profileImageUrl: null };
const PICKED_IMAGE = { base64: 'aGk=', mimeType: 'image/png', width: 600, height: 600 };
const UPLOADED_URL = 'https://cdn.example.com/profile/1.png';
const GROUPS: Group[] = [
  { id: 1, name: '카페', color: 'yellow', placeCount: 30 },
  { id: 2, name: '독립영화관', color: 'blue', placeCount: 2 },
];

// HTTP 전송이 아니라 화면 ↔ Query ↔ feature API 배선만 검증한다.
const mocks = vi.hoisted(() => ({
  fetchMyProfile: vi.fn(),
  requestLogout: vi.fn(),
  requestWithdraw: vi.fn(),
  updateMyProfile: vi.fn(),
  uploadProfileImage: vi.fn(),
  fetchGroups: vi.fn(),
  clearSession: vi.fn(),
  requestImagePick: vi.fn(),
  isNative: true,
}));

vi.mock('@/features/my/api', () => ({
  fetchMyProfile: mocks.fetchMyProfile,
  requestLogout: mocks.requestLogout,
  requestWithdraw: mocks.requestWithdraw,
  updateMyProfile: mocks.updateMyProfile,
  uploadProfileImage: mocks.uploadProfileImage,
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
      <ToastProvider>
        <MemoryRouter initialEntries={['/my']}>
          <BottomMenuVisibilityProvider value={{ hidden: false, setHidden }}>
            <Routes>
              <Route path="/my" element={<MyPage />} />
              <Route path="/privacy" element={<PrivacyPolicyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/support" element={<ContactPage />} />
            </Routes>
          </BottomMenuVisibilityProvider>
        </MemoryRouter>
      </ToastProvider>
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
    mocks.requestWithdraw.mockResolvedValue(undefined);
    mocks.clearSession.mockResolvedValue(undefined);
    mocks.updateMyProfile.mockImplementation(async (patch) => ({ ...PROFILE, ...patch }));
    mocks.uploadProfileImage.mockResolvedValue(UPLOADED_URL);
  });

  it('내 정보와 그룹·저장 개수, 앱 메뉴를 렌더한다', async () => {
    renderMyPage();

    expect(await screen.findByText('졸림핑')).toBeInTheDocument();
    expect(await screen.findByText('Group 2 · Save 32')).toBeInTheDocument();
    expect(screen.getByText('로그인 정보')).toBeInTheDocument();
    expect(screen.getByText('개인정보 처리방침')).toBeInTheDocument();
    expect(screen.getByText('이용약관')).toBeInTheDocument();
    expect(screen.getByText('문의하기')).toBeInTheDocument();
    // 로그인 정보는 이동할 곳이 없어 눌리지 않는 행이다(화살표 없음).
    expect(screen.queryByRole('button', { name: /로그인 정보/ })).not.toBeInTheDocument();
  });

  it('개인정보 처리방침 페이지로 이동한다', async () => {
    renderMyPage();
    await screen.findByText('졸림핑');

    fireEvent.click(screen.getByRole('button', { name: /개인정보 처리방침/ }));
    expect(screen.getByText('개인정보처리방침')).toBeInTheDocument();
    expect(screen.getByText('1. 수집하는 개인정보 항목')).toBeInTheDocument();
  });

  it('이용약관 페이지로 이동한다', async () => {
    renderMyPage();
    await screen.findByText('졸림핑');

    fireEvent.click(screen.getByRole('button', { name: /^이용약관$/ }));
    expect(screen.getByText('NOOK 서비스 이용약관')).toBeInTheDocument();
    expect(screen.getByText('1. 서비스의 범위')).toBeInTheDocument();
  });

  it('문의하기 페이지에서 메일 링크와 자주 묻는 질문을 제공한다', async () => {
    renderMyPage();
    await screen.findByText('졸림핑');

    fireEvent.click(screen.getByRole('button', { name: /문의하기/ }));

    expect(
      screen.getByRole('heading', { name: '누크에 무엇이든 물어보세요!' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '이메일 문의하기' })).toHaveAttribute(
      'href',
      'mailto:everynook123@gmail.com',
    );
    expect(screen.getByRole('heading', { name: '자주 묻는 질문' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '게시물이 저장되지 않아요' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '계정을 삭제하고 싶어요' })).toBeInTheDocument();
  });

  it('내 정보를 불러오는 동안 카드 자리를 스켈레톤으로 채운다', () => {
    mocks.fetchMyProfile.mockReturnValue(new Promise(() => {}));
    renderMyPage();

    expect(document.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
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

    await waitFor(() =>
      expect(mocks.updateMyProfile).toHaveBeenCalledWith({ nickname: 'new nook' }),
    );
    // 사진을 안 골랐으면 업로드까지 가지 않는다.
    expect(mocks.uploadProfileImage).not.toHaveBeenCalled();
    expect(await screen.findByText('new nook')).toBeInTheDocument();
    expect(setHidden).toHaveBeenLastCalledWith(false);
  });

  it('고른 사진을 업로드해서 받은 URL 로 프로필을 저장한다', async () => {
    mocks.requestImagePick.mockResolvedValue({
      requestId: 'r1',
      source: 'album',
      status: 'success',
      image: PICKED_IMAGE,
    });
    renderMyPage();

    fireEvent.click(await screen.findByText('졸림핑'));
    fireEvent.click(screen.getByRole('button', { name: '프로필 이미지 변경' }));
    fireEvent.click(screen.getByText('앨범에서 선택'));
    await waitFor(() => expect(mocks.requestImagePick).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: '저장하기' }));

    await waitFor(() => expect(mocks.uploadProfileImage).toHaveBeenCalledWith(PICKED_IMAGE));
    expect(mocks.updateMyProfile).toHaveBeenCalledWith({
      nickname: '졸림핑',
      profileImageUrl: UPLOADED_URL,
    });
    // 저장된 뒤에는 미리보기가 아니라 서버가 준 URL 을 그린다.
    await waitFor(() => {
      expect(screen.getByAltText('프로필 이미지')).toHaveAttribute('src', UPLOADED_URL);
    });
  });

  it('업로드가 실패하면 편집 화면에 남아 안내한다', async () => {
    mocks.uploadProfileImage.mockRejectedValue(new Error('upload'));
    mocks.requestImagePick.mockResolvedValue({
      requestId: 'r1',
      source: 'album',
      status: 'success',
      image: PICKED_IMAGE,
    });
    renderMyPage();

    fireEvent.click(await screen.findByText('졸림핑'));
    fireEvent.click(screen.getByRole('button', { name: '프로필 이미지 변경' }));
    fireEvent.click(screen.getByText('앨범에서 선택'));
    await waitFor(() => expect(mocks.requestImagePick).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: '저장하기' }));

    expect(await screen.findByText('저장하지 못했어요')).toBeInTheDocument();
    expect(mocks.updateMyProfile).not.toHaveBeenCalled();
    // 편집 화면에 그대로 남아 고른 사진을 유지한다.
    expect(screen.getByText('회원 정보')).toBeInTheDocument();
    expect(screen.getByAltText('프로필 이미지')).toHaveAttribute(
      'src',
      'data:image/png;base64,aGk=',
    );
  });

  it('저장하지 않고 나가면 고른 사진을 버린다', async () => {
    mocks.requestImagePick.mockResolvedValue({
      requestId: 'r1',
      source: 'album',
      status: 'success',
      image: PICKED_IMAGE,
    });
    renderMyPage();

    fireEvent.click(await screen.findByText('졸림핑'));
    fireEvent.click(screen.getByRole('button', { name: '프로필 이미지 변경' }));
    fireEvent.click(screen.getByText('앨범에서 선택'));
    await waitFor(() => {
      expect(screen.getByAltText('프로필 이미지')).toHaveAttribute(
        'src',
        'data:image/png;base64,aGk=',
      );
    });

    fireEvent.click(screen.getByRole('button', { name: '마이페이지로 돌아가기' }));

    expect(mocks.uploadProfileImage).not.toHaveBeenCalled();
    // 마이페이지 카드에는 저장 안 된 미리보기가 남지 않는다.
    expect(screen.getByAltText('프로필 이미지')).not.toHaveAttribute(
      'src',
      'data:image/png;base64,aGk=',
    );
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

  it('탈퇴를 확인하면 계정 삭제 후 세션을 지운다', async () => {
    renderMyPage();
    await screen.findByText('졸림핑');

    fireEvent.click(screen.getByRole('button', { name: '탈퇴하기' }));
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveTextContent('탈퇴하시겠어요?');
    fireEvent.click(within(dialog).getByRole('button', { name: '탈퇴하기' }));

    await waitFor(() => expect(mocks.clearSession).toHaveBeenCalled());
    expect(mocks.requestWithdraw).toHaveBeenCalled();
  });

  it('탈퇴가 실패하면 세션을 지우지 않고 안내한다', async () => {
    mocks.requestWithdraw.mockRejectedValue(new Error('server'));
    renderMyPage();
    await screen.findByText('졸림핑');

    fireEvent.click(screen.getByRole('button', { name: '탈퇴하기' }));
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: '탈퇴하기' }),
    );

    expect(await screen.findByText('탈퇴하지 못했어요')).toBeInTheDocument();
    expect(mocks.clearSession).not.toHaveBeenCalled();
  });
});
