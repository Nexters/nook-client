import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider, useToast } from './ToastProvider';

// Radix Toast 의 자동 소멸 타이머와 ToastProvider 의 퇴장 대기(TOAST_EXIT_MS)를
// 실시간으로 기다리지 않도록 fake timer 로 진행시킨다.
const TOAST_DURATION_MS = 3000;
const TOAST_EXIT_MS = 200;

const onAction = vi.fn();
const onUndo = vi.fn();

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
      <button
        type="button"
        onClick={() => showToast({ variant: 'undo', title: '장소가 삭제 됐어요.', onUndo })}
      >
        show-undo
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
    onUndo.mockClear();
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

  it('창 포커스가 없어도 3초 뒤 사라진다 — WebView 는 첫 터치 전까지 포커스 이벤트가 없다', async () => {
    renderHarness();
    // Radix 는 토스트가 떠 있는 동안 window blur 가 오면 타이머를 멈추고 focus 가 와야
    // 재개한다 — 네이티브 WebView 에서 focus 가 영영 안 오는 상황을 재현한다.
    fireEvent.click(screen.getByText('show-simple'));
    expect(screen.getByText('지도에서 숨겼어요.')).toBeInTheDocument();
    fireEvent.blur(window);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(TOAST_DURATION_MS);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(TOAST_EXIT_MS);
    });

    expect(screen.queryByText('지도에서 숨겼어요.')).not.toBeInTheDocument();
  });

  it('액션이 달린 토스트끼리는 큐잉된다 — 먼저 뜬 게 사라진 뒤에야 다음이 보인다', async () => {
    renderHarness();
    fireEvent.click(screen.getByText('show-action'));
    fireEvent.click(screen.getByText('show-undo'));

    expect(screen.getByText('게시물 저장이 완료됐어요!')).toBeInTheDocument();
    expect(screen.queryByText('장소가 삭제 됐어요.')).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(TOAST_DURATION_MS);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(TOAST_EXIT_MS);
    });

    expect(screen.queryByText('게시물 저장이 완료됐어요!')).not.toBeInTheDocument();
    expect(screen.getByText('장소가 삭제 됐어요.')).toBeInTheDocument();
  });

  // 핀 On/Off 를 연달아 누르면 새 문구가 3초 넘게 안 뜬다는 QA — 방금 한 동작의 피드백이
  // 밀리면 화면이 이미 지난 상태를 말한다.
  it('simple 은 떠 있는 알림을 기다리지 않고 즉시 갈아치운다', () => {
    renderHarness();
    fireEvent.click(screen.getByText('show-description'));
    fireEvent.click(screen.getByText('show-simple'));

    expect(screen.getByText('지도에서 숨겼어요.')).toBeInTheDocument();
    expect(screen.queryByText('위치를 찾지 못 했어요')).not.toBeInTheDocument();
  });

  it('simple 이 연달아 와도 마지막 것만 남는다 — 큐에 쌓아두지 않는다', async () => {
    renderHarness();
    fireEvent.click(screen.getByText('show-simple'));
    fireEvent.click(screen.getByText('show-simple'));

    expect(screen.getByText('지도에서 숨겼어요.')).toBeInTheDocument();

    // 큐에 쌓였다면 첫 번째가 사라진 뒤 두 번째가 다시 떠오른다(수명·퇴장을 따로 진행시킨다).
    await act(async () => {
      await vi.advanceTimersByTimeAsync(TOAST_DURATION_MS);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(TOAST_EXIT_MS);
    });

    expect(screen.queryByText('지도에서 숨겼어요.')).not.toBeInTheDocument();
  });

  it('액션이 달린 토스트는 simple 에 밀려나지 않는다 — 누를 기회를 뺏지 않는다', async () => {
    renderHarness();
    fireEvent.click(screen.getByText('show-undo'));
    fireEvent.click(screen.getByText('show-simple'));

    expect(screen.getByText('장소가 삭제 됐어요.')).toBeInTheDocument();
    expect(screen.queryByText('지도에서 숨겼어요.')).not.toBeInTheDocument();

    // 수명과 퇴장 대기를 따로 진행시킨다 — 퇴장 타이머는 수명이 끝난 뒤에 걸린다.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(TOAST_DURATION_MS);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(TOAST_EXIT_MS);
    });

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

  it('undo 타입은 고정 라벨 "실행취소"를 누르면 콜백을 부르고 토스트를 닫는다', async () => {
    renderHarness();
    fireEvent.click(screen.getByText('show-undo'));

    fireEvent.click(screen.getByRole('button', { name: '실행취소' }));
    expect(onUndo).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(TOAST_EXIT_MS);
    });

    expect(screen.queryByText('장소가 삭제 됐어요.')).not.toBeInTheDocument();
  });
});
