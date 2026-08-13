import { describe, expect, it } from 'vitest';
import { CLUSTER_CELL_SIZE_PX, PIN_DETAIL_MIN_ZOOM } from './constants';
import { clusterPins } from './pin-cluster';
import type { MapPin } from './types';

function pin(id: number, lat: number, lng: number): MapPin {
  return { id, lat, lng, name: `장소 ${id}`, color: 'blue' };
}

/** 해당 줌에서 격자 한 칸이 몇 도(경도)인지 — 테스트가 상수 변경에 따라 같이 움직이게 한다. */
function cellWidthInDegrees(zoom: number) {
  return (CLUSTER_CELL_SIZE_PX * 360) / (256 * 2 ** zoom);
}

/**
 * `lng` 가 속한 격자 칸의 왼쪽 경계 경도. "같은 칸"을 확정적으로 만들려면 필요하다 —
 * 그냥 가까이 붙여 놓는 것만으로는 하필 칸 경계를 넘어 갈라질 수 있다.
 */
function cellOriginLng(lng: number, zoom: number) {
  const scale = 256 * 2 ** zoom;
  const worldX = ((lng + 180) / 360) * scale;
  const originWorldX = Math.floor(worldX / CLUSTER_CELL_SIZE_PX) * CLUSTER_CELL_SIZE_PX;
  return (originWorldX / scale) * 360 - 180;
}

describe('clusterPins', () => {
  it('같은 칸의 핀은 하나로 묶고 무게중심에 놓는다', () => {
    const zoom = 10;
    const width = cellWidthInDegrees(zoom);
    // 한 칸 안쪽 1/4·1/2·3/4 지점 — 경계에 걸릴 여지가 없다.
    const origin = cellOriginLng(127, zoom);
    const lngs = [origin + width * 0.25, origin + width * 0.5, origin + width * 0.75];
    const clusters = clusterPins(
      lngs.map((lng, index) => pin(index + 1, 37.5, lng)),
      zoom,
    );
    const [cluster] = clusters;

    expect(clusters).toHaveLength(1);
    expect(cluster?.pins.map((item) => item.id)).toEqual([1, 2, 3]);
    expect(cluster?.lng).toBeCloseTo(origin + width * 0.5, 6);
    expect(cluster?.lat).toBeCloseTo(37.5, 6);
  });

  it('멀리 떨어진 핀은 각각 다른 클러스터가 된다', () => {
    const zoom = 10;
    // 세 칸 너비만큼 벌리면 경계에 어떻게 걸려도 같은 칸이 될 수 없다.
    const gap = cellWidthInDegrees(zoom) * 3;
    const clusters = clusterPins([pin(1, 37.5, 127), pin(2, 37.5, 127 + gap)], zoom);

    expect(clusters).toHaveLength(2);
    expect(clusters.map((cluster) => cluster.pins.length)).toEqual([1, 1]);
  });

  it('핀이 하나면 멤버 1개인 클러스터를 그대로 돌려준다 — 시안에 "1" 버블이 있다', () => {
    const clusters = clusterPins([pin(1, 37.5, 127)], 9);
    const [cluster] = clusters;

    expect(clusters).toHaveLength(1);
    expect(cluster?.pins).toHaveLength(1);
    expect(cluster?.lat).toBe(37.5);
    expect(cluster?.lng).toBe(127);
  });

  it('줌인할수록 같은 핀들이 더 잘게 쪼개진다', () => {
    // 줌 8 에서 한 칸에 들어가는 간격 — 줌이 커지면 칸이 그만큼 좁아져 갈라진다.
    const pins = [
      pin(1, 37.5, 127),
      pin(2, 37.5, 127 + cellWidthInDegrees(8) / 4),
      pin(3, 37.5, 127 + cellWidthInDegrees(8) / 2),
    ];

    expect(clusterPins(pins, 8).length).toBeLessThan(clusterPins(pins, 14).length);
  });

  it('입력이 비면 빈 배열을 돌려준다', () => {
    expect(clusterPins([], PIN_DETAIL_MIN_ZOOM - 1)).toEqual([]);
  });

  it('key 는 좌표에만 달려 있어 지도를 팬해도(같은 줌·같은 칸이면) 그대로다', () => {
    const zoom = 11;
    const [first] = clusterPins([pin(1, 37.5, 127)], zoom);
    // 같은 좌표의 다른 핀 객체 — 월드 격자 기준이라 key 는 핀 id 와 무관하다.
    const [second] = clusterPins([pin(99, 37.5, 127)], zoom);

    expect(first?.key).toBe(second?.key);
  });
});
