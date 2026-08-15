import { render, screen } from '@testing-library/react';
import { PinnedHeaderLayout } from '@/app/layouts/PinnedHeaderLayout';

/** jsdom 은 레이아웃을 계산하지 않아 offsetHeight 가 항상 0 이라, 고정 영역 높이를 직접 심는다. */
function stubOffsetHeight(height: number) {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get() {
      return this.className?.includes?.('fixed') ? height : 0;
    },
  });
  return () => {
    if (descriptor) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', descriptor);
  };
}

describe('PinnedHeaderLayout', () => {
  it('헤더를 body 로 포탈해 화면 상단에 고정한다', () => {
    const { container } = render(
      <PinnedHeaderLayout header={<header>헤더</header>}>
        <p>콘텐츠</p>
      </PinnedHeaderLayout>,
    );

    const pinned = screen.getByText('헤더').closest('.fixed');
    // 문서(#root)가 스크롤돼도 헤더가 밀려나지 않으려면 셸 밖(body)에 있어야 한다.
    expect(pinned?.parentElement).toBe(document.body);
    expect(pinned).toHaveClass('top-0');
    expect(container).not.toContainElement(pinned as HTMLElement);
    expect(screen.getByText('콘텐츠')).toBeInTheDocument();
  });

  it('고정 영역 높이만큼 콘텐츠를 내려서 헤더가 콘텐츠를 가리지 않게 한다', () => {
    const restore = stubOffsetHeight(120);
    try {
      render(
        <PinnedHeaderLayout header={<header>헤더</header>}>
          <p>콘텐츠</p>
        </PinnedHeaderLayout>,
      );

      expect(screen.getByText('콘텐츠').parentElement).toHaveStyle({ paddingTop: '120px' });
    } finally {
      restore();
    }
  });

  it('노치와 겹치지 않게 고정 영역 상단에 safe area 를 둔다', () => {
    render(
      <PinnedHeaderLayout header={<header>헤더</header>}>
        <p>콘텐츠</p>
      </PinnedHeaderLayout>,
    );

    expect(screen.getByText('헤더').parentElement).toHaveStyle({
      paddingTop: 'env(safe-area-inset-top)',
    });
  });
});
