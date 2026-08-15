import { describe, expect, it } from 'vitest';
import { CLUSTER_MERGE_RADIUS_PX, PIN_DETAIL_MIN_ZOOM } from './constants';
import { clusterPins } from './pin-cluster';
import type { MapPin } from './types';

function pin(id: number, lat: number, lng: number): MapPin {
  return { id, lat, lng, name: `장소 ${id}`, color: 'blue' };
}

/** 해당 줌에서 화면 1px 이 몇 도(경도)인지 — 테스트가 상수 변경에 따라 같이 움직이게 한다. */
function degreesPerPixel(zoom: number) {
  return 360 / (256 * 2 ** zoom);
}

/** 화면상 `px` 픽셀만큼 동쪽으로 떨어진 경도. */
function lngOffsetByPixels(lng: number, px: number, zoom: number) {
  return lng + px * degreesPerPixel(zoom);
}

describe('clusterPins', () => {
  it('반경 안의 핀은 하나로 묶고 무게중심에 놓는다', () => {
    const zoom = 10;
    const half = CLUSTER_MERGE_RADIUS_PX / 2;
    const pins = [
      pin(1, 37.5, 127),
      pin(2, 37.5, lngOffsetByPixels(127, half / 2, zoom)),
      pin(3, 37.5, lngOffsetByPixels(127, half, zoom)),
    ];
    const clusters = clusterPins(pins, zoom);
    const [cluster] = clusters;

    expect(clusters).toHaveLength(1);
    expect(cluster?.pins.map((item) => item.id).sort()).toEqual([1, 2, 3]);
    expect(cluster?.lat).toBeCloseTo(37.5, 6);
  });

  it('격자와 달리 경계 위치에 상관없이 붙어 있으면 합쳐진다', () => {
    const zoom = 10;
    // 격자 방식이라면 칸 경계가 사이를 지날 때 갈라졌을 아주 가까운 두 점.
    // 어떤 시작 경도에서 출발해도 항상 한 덩어리여야 한다.
    const gap = CLUSTER_MERGE_RADIUS_PX / 4;
    for (const baseLng of [126.9, 126.97, 127.0, 127.013, 127.0249, 127.05]) {
      const clusters = clusterPins(
        [pin(1, 37.5, baseLng), pin(2, 37.5, lngOffsetByPixels(baseLng, gap, zoom))],
        zoom,
      );
      expect(clusters, `baseLng=${baseLng}`).toHaveLength(1);
    }
  });

  it('반경 밖의 핀은 각각 다른 클러스터가 된다', () => {
    const zoom = 10;
    const far = CLUSTER_MERGE_RADIUS_PX * 2;
    const clusters = clusterPins(
      [pin(1, 37.5, 127), pin(2, 37.5, lngOffsetByPixels(127, far, zoom))],
      zoom,
    );

    expect(clusters).toHaveLength(2);
    expect(clusters.map((cluster) => cluster.pins.length)).toEqual([1, 1]);
  });

  it('병합이 연쇄되지 않는다 — 이웃의 이웃까지 끌어오지 않는다', () => {
    const zoom = 10;
    const step = CLUSTER_MERGE_RADIUS_PX * 0.75;
    // 1—2 는 반경 안, 2—3 도 반경 안이지만 1—3 은 반경 밖이다.
    // 연쇄 병합이면 셋이 한 덩어리가 되어 무게중심이 2 위에 찍힌다.
    const clusters = clusterPins(
      [
        pin(1, 37.5, 127),
        pin(2, 37.5, lngOffsetByPixels(127, step, zoom)),
        pin(3, 37.5, lngOffsetByPixels(127, step * 2, zoom)),
      ],
      zoom,
    );

    expect(clusters).toHaveLength(2);
    expect(clusters.map((cluster) => cluster.pins.length)).toEqual([2, 1]);
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
    const pins = [
      pin(1, 37.5, 127),
      pin(2, 37.5, lngOffsetByPixels(127, CLUSTER_MERGE_RADIUS_PX / 2, 8)),
      pin(3, 37.5, lngOffsetByPixels(127, CLUSTER_MERGE_RADIUS_PX, 8)),
    ];

    expect(clusterPins(pins, 8).length).toBeLessThan(clusterPins(pins, 14).length);
  });

  it('입력이 비면 빈 배열을 돌려준다', () => {
    expect(clusterPins([], PIN_DETAIL_MIN_ZOOM - 1)).toEqual([]);
  });

  it('입력 순서가 바뀌어도 같은 그룹과 같은 key 가 나온다', () => {
    const zoom = 11;
    const near = CLUSTER_MERGE_RADIUS_PX / 3;
    const pins = [
      pin(7, 37.5, 127),
      pin(3, 37.5, lngOffsetByPixels(127, near, zoom)),
      pin(9, 37.6, 127.3),
    ];

    const forward = clusterPins(pins, zoom);
    const reversed = clusterPins([...pins].reverse(), zoom);

    expect(reversed.map((cluster) => cluster.key)).toEqual(forward.map((cluster) => cluster.key));
    expect(reversed.map((cluster) => cluster.pins.length)).toEqual(
      forward.map((cluster) => cluster.pins.length),
    );
  });
});
