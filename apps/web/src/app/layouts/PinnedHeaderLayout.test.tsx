import { act, fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { vi } from 'vitest';
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

  it('collapseAfter 가 헤더 뒤로 숨은 뒤 아래로 스크롤하면 헤더를 접고, 위로 스크롤하면 편다', () => {
    const restore = stubOffsetHeight(100);
    // 대상이 이미 고정 영역 뒤로 숨어 있다고 보고한다.
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(private callback: IntersectionObserverCallback) {}
        observe() {
          this.callback(
            [{ boundingClientRect: { bottom: 0 } } as IntersectionObserverEntry],
            this as unknown as IntersectionObserver,
          );
        }
        disconnect() {}
      },
    );
    const root = document.createElement('div');
    root.id = 'root';
    document.body.append(root);
    let scrollTop = 0;
    Object.defineProperty(root, 'scrollTop', { get: () => scrollTop, configurable: true });
    Object.defineProperty(root, 'scrollHeight', { value: 2000, configurable: true });
    Object.defineProperty(root, 'clientHeight', { value: 800, configurable: true });
    const scrollTo = (top: number) =>
      act(() => {
        scrollTop = top;
        fireEvent.scroll(root);
      });

    function Page() {
      const infoRef = useRef<HTMLDivElement>(null);
      return (
        <PinnedHeaderLayout header={<header>헤더</header>} collapseAfter={infoRef}>
          <div ref={infoRef}>정보</div>
        </PinnedHeaderLayout>
      );
    }

    try {
      render(<Page />);
      const headerBox = screen.getByText('헤더').parentElement;
      const content = screen.getByText('정보').parentElement;

      scrollTo(300);
      expect(headerBox).toHaveAttribute('inert');
      // 접힌 동안 탭 줄은 safe area 바로 밑에 붙는다.
      expect(content?.style.getPropertyValue('--pinned-header-height')).toBe(
        'env(safe-area-inset-top)',
      );

      scrollTo(200);
      expect(headerBox).not.toHaveAttribute('inert');
      expect(content?.style.getPropertyValue('--pinned-header-height')).toBe('100px');

      // 끝에서 러버밴드로 당겨졌다 되튀는 건 방향 전환이 아니다.
      scrollTo(1200);
      scrollTo(1300);
      scrollTo(1250);
      expect(headerBox).toHaveAttribute('inert');
    } finally {
      restore();
      root.remove();
      vi.unstubAllGlobals();
    }
  });
});
