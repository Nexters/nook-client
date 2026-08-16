import { useEffect, useState } from 'react';

/**
 * 값이 잠잠해진 뒤(delayMs)에만 따라 바뀌는 지연 값.
 * 타이핑마다 검색 API 를 부르지 않도록 검색 입력 → 쿼리 사이에 끼운다.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
