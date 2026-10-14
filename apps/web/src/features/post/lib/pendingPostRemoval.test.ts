import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOAST_DURATION_MS, TOAST_EXIT_MS } from '@/shared/toast';
import { deferPostRemoval, useHiddenPostIds } from './pendingPostRemoval';

const WINDOW = TOAST_DURATION_MS + TOAST_EXIT_MS;

describe('deferPostRemoval', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('실행취소 창이 닫힐 때까지 보내지 않고 목록에서만 감췄다가, 반영되면 다시 푼다', async () => {
    const commit = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useHiddenPostIds());

    act(() => {
      deferPostRemoval(1, { hide: true, commit, onError: vi.fn() });
    });
    expect(result.current.has(1)).toBe(true);

    await act(() => vi.advanceTimersByTimeAsync(WINDOW - 1));
    expect(commit).not.toHaveBeenCalled();

    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(commit).toHaveBeenCalledTimes(1);
    expect(result.current.has(1)).toBe(false);
  });

  it('실행취소하면 아무것도 보내지 않고 다시 보인다', async () => {
    const commit = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useHiddenPostIds());

    let undo = () => {};
    act(() => {
      undo = deferPostRemoval(2, { hide: true, commit, onError: vi.fn() });
    });
    act(() => undo());
    await act(() => vi.advanceTimersByTimeAsync(WINDOW));

    expect(commit).not.toHaveBeenCalled();
    expect(result.current.has(2)).toBe(false);
  });

  it('실패하면 다시 보이게 하고 onError 를 부른다', async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useHiddenPostIds());

    act(() => {
      deferPostRemoval(3, { hide: true, commit: () => Promise.reject(new Error('x')), onError });
    });
    await act(() => vi.advanceTimersByTimeAsync(WINDOW));

    expect(onError).toHaveBeenCalledTimes(1);
    expect(result.current.has(3)).toBe(false);
  });
});
