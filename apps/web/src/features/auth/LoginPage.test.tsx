import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { LoginPage } from '@/features/auth/LoginPage';

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  it('온보딩과 소셜 로그인 버튼을 렌더한다', () => {
    renderLoginPage();

    expect(screen.getByRole('img', { name: 'nook' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /마음에 드는 장소를 발견했다면/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '카카오로 시작하기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apple로 시작하기' })).toBeInTheDocument();
  });

  it('인디케이터로 다음 온보딩을 보여준다', () => {
    renderLoginPage();

    fireEvent.click(screen.getByRole('button', { name: '2번째 온보딩 보기' }));

    expect(screen.getByRole('heading', { name: /게시물을 저장하고/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '3번째 온보딩 보기' }));

    expect(screen.getByRole('heading', { name: /그룹별로 장소를 모아/ })).toBeInTheDocument();
  });

  it('소셜 로그인 버튼으로 앱 화면에 진입한다', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/map" element={<p>지도 화면</p>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: '카카오로 시작하기' }));

    expect(screen.getByText('지도 화면')).toBeInTheDocument();
  });

  it('development 테스트 세션 화면으로 이동한다', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dev/ut" element={<p>테스트 세션 화면</p>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: '테스트 토큰으로 로그인' }));

    expect(screen.getByText('테스트 세션 화면')).toBeInTheDocument();
  });
});
