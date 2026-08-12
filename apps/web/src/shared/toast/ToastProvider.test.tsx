import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider, useToast } from './ToastProvider';

// Radix Toast 의 자동 소멸 타이머와 ToastProvider 의 퇴장 대기(TOAST_EXIT_MS)를
// 실시간으로 기다리지 않도록 fake timer 로 진행시킨다.
const TOAST_DURATION_MS = 3000;
const TOAST_EXIT_MS = 200;

const onAction = vi.fn();

function Harness() {
  const { showToast } = useToast();
  return (
    <>
      <button
        type="button"
        onClick={() =>
          showToast({
            variant: 'description',
            title: '위치를 찾지 못 했어요',
            description: '지도에는 표시되지 않아요',
          })
        }
      >
        show-description
      </button>
      <button
        type="button"
        onClick={() => showToast({ variant: 'simple', title: '지도에서 숨겼어요.' })}
      >
        show-simple
      </button>
      <button
        type="button"
        onClick={() =>
          showToast({
            variant: 'action',
            title: '게시물 저장이 완료됐어요!',
            actionLabel: '보러가기',
            onAction,
          })
        }
      >
        show-action
      </button>
    </>
  );
}

function renderHarness() {
  return render(
    <ToastProvider>
      <Harness />
    </ToastProvider>,
  );
}

describe('ToastProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    onAction.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('description 타입은 제목과 설명을 함께 보여준다', () => {
    renderHarness();

    fireEvent.click(screen.getByText('show-description'));

    expect(screen.getByText('위치를 찾지 못 했어요')).toBeInTheDocument();
    expect(screen.getByText('지도에는 표시되지 않아요')).toBeInTheDocument();
  });

  it('노출 후 3초가 지나면 자동으로 사라진다', async () => {
    renderHarness();
    fireEvent.click(screen.getByText('show-simple'));
    expect(screen.getByText('지도에서 숨겼어요.')).toBeInTheDocument();

    // 두 단계로 나눠 진행한다 — 첫 구간에서 Radix 타이머가 닫힘을 알리고 나서야
    // 퇴장 대기(TOAST_EXIT_MS) 타이머가 새로 걸리므로, 한 번에 뭉쳐 진행하면
    // 그 사이 커밋된 effect 를 fake timer 가 못 따라잡을 수 있다.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(TOAST_DURATION_MS);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(TOAST_EXIT_MS);
    });

    expect(screen.queryByText('지도에서 숨겼어요.')).not.toBeInTheDocument();
  });

  it('노출 중 연달아 띄우면 먼저 뜬 토스트가 사라진 뒤에야 다음 토스트가 보인다', async () => {
    renderHarness();
    fireEvent.click(screen.getByText('show-description'));
    fireEvent.click(screen.getByText('show-simple'));

    // 큐잉: 두 번째는 첫 번째가 소멸하기 전까지 보이지 않는다.
    expect(screen.getByText('위치를 찾지 못 했어요')).toBeInTheDocument();
    expect(screen.queryByText('지도에서 숨겼어요.')).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(TOAST_DURATION_MS);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(TOAST_EXIT_MS);
    });

    expect(screen.queryByText('위치를 찾지 못 했어요')).not.toBeInTheDocument();
    expect(screen.getByText('지도에서 숨겼어요.')).toBeInTheDocument();
  });

  it('action 타입은 버튼을 누르면 콜백을 부르고 토스트를 닫는다', async () => {
    renderHarness();
    fireEvent.click(screen.getByText('show-action'));

    fireEvent.click(screen.getByRole('button', { name: '보러가기' }));
    expect(onAction).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(TOAST_EXIT_MS);
    });

    expect(screen.queryByText('게시물 저장이 완료됐어요!')).not.toBeInTheDocument();
  });
});
