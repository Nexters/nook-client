import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { BottomMenuVisibilityProvider } from '@/app/bottom-menu-visibility';
import { MyPage } from '@/features/my/MyPage';

function renderMyPage() {
  const setHidden = vi.fn();
  render(
    <BottomMenuVisibilityProvider value={{ hidden: false, setHidden }}>
      <MyPage />
    </BottomMenuVisibilityProvider>,
  );
  return { setHidden };
}

describe('MyPage', () => {
  it('사용자 정보와 앱 메뉴를 렌더한다', () => {
    renderMyPage();

    expect(screen.getByText('졸림핑')).toBeInTheDocument();
    expect(screen.getByText('Group 5 · Save 32')).toBeInTheDocument();
    expect(screen.getByText('로그인 정보')).toBeInTheDocument();
    expect(screen.getByText('개인정보 처리방침')).toBeInTheDocument();
    expect(screen.getByText('이용약관')).toBeInTheDocument();
    expect(screen.getByText('문의하기')).toBeInTheDocument();
  });

  it('회원 정보를 편집하고 저장한다', () => {
    const { setHidden } = renderMyPage();

    fireEvent.click(screen.getByText('졸림핑'));
    expect(screen.getByText('회원 정보')).toBeInTheDocument();
    expect(setHidden).toHaveBeenLastCalledWith(true);

    const nicknameInput = screen.getByRole('textbox', { name: '닉네임' });
    fireEvent.change(nicknameInput, { target: { value: 'new nook' } });
    fireEvent.click(screen.getByRole('button', { name: '저장하기' }));

    expect(screen.getByText('new nook')).toBeInTheDocument();
    expect(setHidden).toHaveBeenLastCalledWith(false);
  });

  it('로그아웃과 탈퇴 확인 팝업을 연다', () => {
    renderMyPage();

    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('로그아웃 하시겠어요?');
    fireEvent.click(screen.getByRole('button', { name: '취소' }));

    fireEvent.click(screen.getByRole('button', { name: '탈퇴하기' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('탈퇴하시겠어요?');
  });
});
