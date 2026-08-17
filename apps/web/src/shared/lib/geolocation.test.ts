import { describe, expect, it } from 'vitest';
import { formatDistanceFromMeters } from './geolocation';

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
