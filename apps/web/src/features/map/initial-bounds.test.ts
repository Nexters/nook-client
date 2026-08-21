import { describe, expect, it } from 'vitest';
import { toInitialBounds } from './initial-bounds';

/** 서울 시청 인근 — 위도에 따라 경도 폭이 달라지므로 좌표를 고정해 둔다. */
const SEOUL = { lat: 37.5729, lng: 126.9762 };
const VIEWPORT = { width: 400, height: 800 };

describe('toInitialBounds', () => {
  it('초기 줌에서 화면이 덮는 범위를 돌려준다', () => {
    const bounds = toInitialBounds(SEOUL, { zoom: 9, ...VIEWPORT });

    // zoom 9 · 위도 37.57 → 약 242m/px. 세로 800px 의 절반이 약 0.87°.
    expect((bounds.north - bounds.south) / 2).toBeCloseTo(0.87, 2);
    // 같은 픽셀 거리라도 경도는 cos(위도) 배로 넓어지고, 화면은 세로가 두 배 길다.
    expect((bounds.east - bounds.west) / 2).toBeCloseTo(0.55, 2);
    expect(bounds.north).toBeGreaterThan(SEOUL.lat);
    expect(bounds.west).toBeLessThan(SEOUL.lng);
  });

  it('줌을 한 단계 멀리 잡으면 경계가 두 배로 넓어진다', () => {
    const near = toInitialBounds(SEOUL, { zoom: 10, ...VIEWPORT });
    const far = toInitialBounds(SEOUL, { zoom: 9, ...VIEWPORT });

    expect(far.north - far.south).toBeCloseTo((near.north - near.south) * 2, 5);
  });

  it('초기 줌이 광역이면 예전 고정값(±0.01°)보다 훨씬 넓다 — 첫 핀 조회가 화면을 덮어야 한다', () => {
    const bounds = toInitialBounds(SEOUL, { zoom: 9, ...VIEWPORT });

    expect(bounds.north - SEOUL.lat).toBeGreaterThan(0.01);
  });
});
