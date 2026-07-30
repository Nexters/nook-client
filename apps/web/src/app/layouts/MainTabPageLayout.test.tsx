import { render, screen } from '@testing-library/react';
import { MainTabPageLayout } from '@/app/layouts/MainTabPageLayout';

describe('MainTabPageLayout', () => {
  it('group/my용 회색 로고 헤더와 safe area를 렌더한다', () => {
    const { container } = render(
      <MainTabPageLayout>
        <p>탭 콘텐츠</p>
      </MainTabPageLayout>,
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
      <MainTabPageLayout variant="transparent">
        <p>지도 콘텐츠</p>
      </MainTabPageLayout>,
    );

    expect(screen.getByRole('banner')).toHaveClass(
      'bg-transparent',
      'absolute',
      'pointer-events-none',
    );
  });
});
