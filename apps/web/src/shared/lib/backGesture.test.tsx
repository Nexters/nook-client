import { cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BackButton } from '@/shared/ui';
import { AllowBackGesture, onBackGestureChange, resetBackGestureForTest } from './backGesture';

/**
 * 알림이 마이크로태스크로 미뤄지고, 이펙트가 그 뒤에 또 한 번 예약할 수 있다 —
 * 매크로태스크로 넘겨 큐가 완전히 빌 때까지 기다린다.
 */
const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

// RTL 자동 cleanup 은 이 훅보다 늦게 돌아, 먼저 초기화하면 뒤이은 언마운트가 카운터를
// 음수로 떨어뜨린다 — 언마운트를 직접 끝낸 뒤 초기화한다(cleanup 은 멱등이다).
afterEach(() => {
  cleanup();
  resetBackGestureForTest();
});

function listen() {
  const calls: boolean[] = [];
  const stop = onBackGestureChange((enabled) => calls.push(enabled));
  return { calls, stop };
}

describe('backGesture — 스와이프 허용 판정', () => {
  it('아무것도 없으면 허용하지 않는다 — 탭 루트·드로어가 여기 해당한다', async () => {
    const { calls } = listen();
    await settle();

    expect(calls).toEqual([false]);
  });

  it('BackButton 이 떠 있으면 허용한다 — 규칙이 곧 이 버튼의 존재다', async () => {
    const { calls } = listen();
    await settle();

    render(
      <MemoryRouter>
        <BackButton />
      </MemoryRouter>,
    );
    await settle();

    expect(calls).toEqual([false, true]);
  });

  it('그 화면을 벗어나면 다시 막는다', async () => {
    const { calls } = listen();
    const view = render(
      <MemoryRouter>
        <BackButton />
      </MemoryRouter>,
    );
    await settle();
    expect(calls.at(-1)).toBe(true);

    view.unmount();
    await settle();

    expect(calls.at(-1)).toBe(false);
  });

  it('AllowBackGesture 로도 선언할 수 있다 — 공용 버튼을 못 쓰는 전체화면 오버레이용', async () => {
    const { calls } = listen();
    render(<AllowBackGesture />);
    await settle();

    expect(calls.at(-1)).toBe(true);
  });

  it('허용 화면끼리 이동해도 껐다 켜지 않는다 — 같은 값은 다시 보내지 않는다', async () => {
    const { calls } = listen();
    await settle();
    expect(calls).toEqual([false]);

    // 라우트 전환: 이전 화면 해제와 새 화면 등록이 같은 커밋에서 함께 일어난다.
    const first = render(<AllowBackGesture />);
    await settle();
    expect(calls).toEqual([false, true]);

    const second = render(<AllowBackGesture />);
    first.unmount();
    await settle();

    // 0 을 스쳐 지나갔더라도 최종값이 그대로면 알림이 없어야 한다.
    expect(calls).toEqual([false, true]);
    second.unmount();
  });

  it('구독을 끊으면 더 이상 알리지 않는다', async () => {
    const spy = vi.fn();
    const stop = onBackGestureChange(spy);
    await settle();
    spy.mockClear();

    stop();
    render(<AllowBackGesture />);
    await settle();

    expect(spy).not.toHaveBeenCalled();
  });
});
