import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getCurrentPosition: vi.fn() }));
vi.mock('@/shared/lib/geolocation', () => ({ getCurrentPosition: mocks.getCurrentPosition }));

// 마지막 좌표를 모듈 변수로 기억하므로 테스트마다 모듈을 새로 불러 초기화한다.
async function loadHook() {
  vi.resetModules();
  return (await import('./useCurrentLocation')).useCurrentLocation;
}

describe('useCurrentLocation', () => {
  beforeEach(() => {
    mocks.getCurrentPosition.mockReset();
  });

  it('첫 진입은 조회가 끝날 때까지 loading 이다', async () => {
    const useCurrentLocation = await loadHook();
    mocks.getCurrentPosition.mockResolvedValue({ lat: 37.5, lng: 127.0 });

    const { result } = renderHook(() => useCurrentLocation());
    expect(result.current).toEqual({ status: 'loading' });
    await waitFor(() =>
      expect(result.current).toEqual({ status: 'resolved', coords: { lat: 37.5, lng: 127.0 } }),
    );
  });

  it('다시 마운트하면 지난 좌표로 즉시 resolved 로 시작하고 뒤에서 갱신한다', async () => {
    const useCurrentLocation = await loadHook();
    mocks.getCurrentPosition.mockResolvedValueOnce({ lat: 37.5, lng: 127.0 });
    const first = renderHook(() => useCurrentLocation());
    await waitFor(() => expect(first.result.current.status).toBe('resolved'));
    first.unmount();

    mocks.getCurrentPosition.mockResolvedValueOnce({ lat: 37.6, lng: 127.1 });
    const second = renderHook(() => useCurrentLocation());
    expect(second.result.current).toEqual({
      status: 'resolved',
      coords: { lat: 37.5, lng: 127.0 },
    });
    await waitFor(() =>
      expect(second.result.current).toEqual({
        status: 'resolved',
        coords: { lat: 37.6, lng: 127.1 },
      }),
    );
  });

  it('재조회가 실패해도 알고 있던 좌표를 지우지 않는다', async () => {
    const useCurrentLocation = await loadHook();
    mocks.getCurrentPosition.mockResolvedValueOnce({ lat: 37.5, lng: 127.0 });
    const first = renderHook(() => useCurrentLocation());
    await waitFor(() => expect(first.result.current.status).toBe('resolved'));
    first.unmount();

    mocks.getCurrentPosition.mockResolvedValueOnce(null);
    const second = renderHook(() => useCurrentLocation());
    await waitFor(() => expect(mocks.getCurrentPosition).toHaveBeenCalledTimes(2));
    expect(second.result.current).toEqual({
      status: 'resolved',
      coords: { lat: 37.5, lng: 127.0 },
    });
  });

  it('한 번도 못 얻었으면 null 로 resolved 된다', async () => {
    const useCurrentLocation = await loadHook();
    mocks.getCurrentPosition.mockResolvedValue(null);
    const { result } = renderHook(() => useCurrentLocation());
    await waitFor(() => expect(result.current).toEqual({ status: 'resolved', coords: null }));
  });
});
