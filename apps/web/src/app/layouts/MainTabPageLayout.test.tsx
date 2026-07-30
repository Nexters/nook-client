import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MainTabPageLayout } from '@/app/layouts/MainTabPageLayout';

describe('MainTabPageLayout', () => {
  it('group/my용 회색 로고 헤더와 safe area를 렌더한다', () => {
    const { container } = render(
      <MemoryRouter>
        <MainTabPageLayout>
          <p>탭 콘텐츠</p>
        </MainTabPageLayout>
      </MemoryRouter>,
    );

    expect(screen.getByRole('img', { name: 'nook' })).toBeInTheDocument();
    expect(screen.getByRole('banner')).toHaveClass('bg-gray-10');
    expect(container.firstElementChild).toHaveStyle({
      paddingTop: 'env(safe-area-inset-top)',
    });
    expect(screen.getByText('탭 콘텐츠')).toBeInTheDocument();
  });

  it('map용 투명 헤더를 콘텐츠 위에 배치한다', () => {
    render(
      <MemoryRouter>
        <MainTabPageLayout variant="transparent">
          <p>지도 콘텐츠</p>
        </MainTabPageLayout>
      </MemoryRouter>,
    );

    expect(screen.getByRole('banner')).toHaveClass(
      'bg-transparent',
      'absolute',
      'pointer-events-none',
    );
  });

  it('로고를 5번 누르면 UT 테스트 도구로 이동한다', () => {
    render(
      <MemoryRouter initialEntries={['/map']}>
        <Routes>
          <Route
            path="/map"
            element={
              <MainTabPageLayout>
                <p>지도 콘텐츠</p>
              </MainTabPageLayout>
            }
          />
          <Route path="/dev/ut" element={<p>UT 테스트 도구 화면</p>} />
        </Routes>
      </MemoryRouter>,
    );

    const logoButton = screen.getByRole('button', { name: 'UT 테스트 도구 열기' });
    for (let tapCount = 0; tapCount < 4; tapCount += 1) fireEvent.click(logoButton);

    expect(screen.queryByText('UT 테스트 도구 화면')).not.toBeInTheDocument();

    fireEvent.click(logoButton);

    expect(screen.getByText('UT 테스트 도구 화면')).toBeInTheDocument();
  });
});
