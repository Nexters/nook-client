import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SlideScreen, useSlideScreen } from '@/app/slide-screen';
import { runBackInterceptors } from '@/shared/lib/backInterceptors';

function Harness({ open = true, close }: { open?: boolean; close: () => void }) {
  const { slidIn, slideOut } = useSlideScreen({ open, close });
  if (!open) return null;
  return (
    <SlideScreen slidIn={slidIn}>
      <button type="button" onClick={slideOut}>
        뒤로
      </button>
    </SlideScreen>
  );
}

function slideScreen() {
  const element = document.querySelector('[data-slot="slide-screen"]');
  if (!element) throw new Error('전환 화면이 없다');
  return element;
}

describe('useSlideScreen', () => {
  it('첫 페인트는 화면 밖에서 시작해 다음 프레임에 제자리로 들어온다', async () => {
    render(<Harness close={vi.fn()} />);

    // 처음부터 제자리면 전환이 걸리지 않는다.
    expect(slideScreen()).toHaveClass('translate-x-full');

    await waitFor(() => expect(slideScreen()).toHaveClass('translate-x-0'));
  });

  it('닫기는 전환이 끝난 다음에 일어난다', async () => {
    const close = vi.fn();
    render(<Harness close={close} />);
    await waitFor(() => expect(slideScreen()).toHaveClass('translate-x-0'));

    fireEvent.click(screen.getByRole('button', { name: '뒤로' }));

    // 먼저 화면 밖으로 밀려나고, 히스토리는 아직 그대로다.
    expect(slideScreen()).toHaveClass('translate-x-full');
    expect(close).not.toHaveBeenCalled();

    await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  });

  it('연타해도 히스토리를 한 번만 되돌린다', async () => {
    const close = vi.fn();
    render(<Harness close={close} />);
    await waitFor(() => expect(slideScreen()).toHaveClass('translate-x-0'));

    const backButton = screen.getByRole('button', { name: '뒤로' });
    fireEvent.click(backButton);
    fireEvent.click(backButton);
    fireEvent.click(backButton);

    await waitFor(() => expect(close).toHaveBeenCalled());
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('Android 하드웨어 백도 같은 전환을 태운다', async () => {
    const close = vi.fn();
    render(<Harness close={close} />);
    await waitFor(() => expect(slideScreen()).toHaveClass('translate-x-0'));

    // 인터셉터가 처리했다고 알려야 native-back 이 히스토리를 따로 되돌리지 않는다.
    // 셸이 부르는 자리라 React 밖에서 상태가 바뀐다 — act 로 렌더를 flush 한다.
    let handled = false;
    act(() => {
      handled = runBackInterceptors();
    });
    expect(handled).toBe(true);

    expect(slideScreen()).toHaveClass('translate-x-full');
    await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  });

  it('닫혀 있으면 뒤로가기를 가로채지 않는다', () => {
    render(<Harness open={false} close={vi.fn()} />);

    expect(runBackInterceptors()).toBe(false);
  });
});
