import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatDistanceFromMeters, getCurrentPosition } from './geolocation';

describe('formatDistanceFromMeters', () => {
  it('1km 미만은 m 단위 정수로 보여준다', () => {
    expect(formatDistanceFromMeters(400)).toBe('400m');
    expect(formatDistanceFromMeters(999.4)).toBe('999m');
  });

  it('1km 이상은 km 소수 1자리로 보여준다', () => {
    expect(formatDistanceFromMeters(16223)).toBe('16.2km');
    expect(formatDistanceFromMeters(4600)).toBe('4.6km');
  });

  it('999.6m 는 1000m 가 아니라 1km 로 넘어간다', () => {
    expect(formatDistanceFromMeters(999.6)).toBe('1km');
  });
});

describe('getCurrentPosition', () => {
  const geolocation = { getCurrentPosition: vi.fn() };

  function stubGeolocation(value: typeof geolocation | undefined) {
    Object.defineProperty(navigator, 'geolocation', { value, configurable: true });
  }

  afterEach(() => {
    geolocation.getCurrentPosition.mockReset();
    stubGeolocation(undefined);
  });

  it('옵션 없이 불러도 캐시 위치 허용과 대기 상한을 넘긴다', async () => {
    stubGeolocation(geolocation);
    geolocation.getCurrentPosition.mockImplementation((success) =>
      success({ coords: { latitude: 37.5, longitude: 127.0 } }),
    );

    await expect(getCurrentPosition()).resolves.toEqual({ lat: 37.5, lng: 127.0 });

    const options = geolocation.getCurrentPosition.mock.calls[0]?.[2] as
      | PositionOptions
      | undefined;
    expect(options?.maximumAge).toBeGreaterThan(0);
    expect(options?.timeout).toBeLessThan(Number.POSITIVE_INFINITY);
  });

  it('오류·타임아웃이면 null 로 조용히 끝난다', async () => {
    stubGeolocation(geolocation);
    geolocation.getCurrentPosition.mockImplementation((_success, error) =>
      error({ code: 3, message: 'Timeout expired' }),
    );

    await expect(getCurrentPosition()).resolves.toBeNull();
  });

  it('API 가 없으면 null', async () => {
    stubGeolocation(undefined);
    await expect(getCurrentPosition()).resolves.toBeNull();
  });
});
