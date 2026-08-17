import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebouncedValue } from './useDebouncedValue';

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('첫 렌더에서는 초기값을 바로 반환한다', () => {
    const { result } = renderHook(() => useDebouncedValue('앤', 300));
    expect(result.current).toBe('앤');
  });

  it('값이 바뀌어도 지연 시간이 지나기 전에는 이전 값을 유지한다', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: '앤' },
    });

    rerender({ value: '앤미' });
    act(() => vi.advanceTimersByTime(299));

    expect(result.current).toBe('앤');
  });

  it('지연 시간이 지나면 마지막 값으로 갱신된다', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: '앤' },
    });

    rerender({ value: '앤미' });
    act(() => vi.advanceTimersByTime(300));

    expect(result.current).toBe('앤미');
  });

  it('지연 중 다시 바뀌면 타이머를 처음부터 다시 센다', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: '앤' },
    });

    rerender({ value: '앤미' });
    act(() => vi.advanceTimersByTime(200));
    rerender({ value: '앤미용' });
    act(() => vi.advanceTimersByTime(200));

    expect(result.current).toBe('앤');

    act(() => vi.advanceTimersByTime(100));
    expect(result.current).toBe('앤미용');
  });
});
