import { CLUSTER_CELL_SIZE_PX } from './constants';
import type { MapPin } from './types';

/** 웹 메르카토르 타일 한 변의 픽셀 수 — 네이버 지도도 256px 타일을 쓴다. */
const TILE_SIZE_PX = 256;

/**
 * 근처 핀을 하나로 묶은 덩어리. 줌아웃 상태에서 `ClusterBubble` 하나로 그려진다.
 */
export interface PinCluster {
  /**
   * 격자 칸 좌표로 만든 key. 월드 좌표 기준이라 지도를 팬해도 같은 칸이면 값이 그대로다
   * (React 가 버블을 다시 마운트하지 않는다). 줌이 바뀌면 칸 자체가 달라져 값도 바뀐다.
   */
  key: string;
  /** 소속 핀들의 무게중심 — 버블을 여기에 놓는다. */
  lat: number;
  lng: number;
  pins: MapPin[];
}

/**
 * 위경도를 해당 줌의 월드 픽셀 좌표로 옮긴다. 화면 픽셀과 같은 좌표계라, 격자를 여기서
 * 자르면 위도에 따라 칸이 찌그러지지 않는다(위경도 도 단위로 자르면 고위도에서 가로가 늘어난다).
 */
function toWorldPixel(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const scale = TILE_SIZE_PX * 2 ** zoom;
  // 극점에서 로그가 발산하므로 sin 값을 살짝 안쪽으로 눌러 둔다.
  const sinLat = Math.min(Math.max(Math.sin((lat * Math.PI) / 180), -0.9999), 0.9999);
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale,
  };
}

/**
 * 핀을 화면 픽셀 격자로 묶는다. `CLUSTER_CELL_SIZE_PX` 한 칸에 들어간 핀들이 한 덩어리가 된다.
 *
 * 지도 인스턴스가 아니라 줌 숫자만 받는 순수 함수다 — 그래서 단위 테스트가 그대로 되고,
 * 호출부(`MapView`)는 idle 시점의 줌만 넘기면 된다.
 *
 * 멤버가 1개인 덩어리도 그대로 하나의 클러스터로 돌려준다 — 줌아웃 시안에 "1" 버블이 있다.
 */
export function clusterPins(pins: MapPin[], zoom: number): PinCluster[] {
  const cells = new Map<string, MapPin[]>();

  for (const pin of pins) {
    const { x, y } = toWorldPixel(pin.lat, pin.lng, zoom);
    const key = `${Math.floor(x / CLUSTER_CELL_SIZE_PX)}:${Math.floor(y / CLUSTER_CELL_SIZE_PX)}`;
    const cell = cells.get(key);
    if (cell) cell.push(pin);
    else cells.set(key, [pin]);
  }

  return [...cells].map(([key, cellPins]) => ({
    key,
    lat: cellPins.reduce((sum, pin) => sum + pin.lat, 0) / cellPins.length,
    lng: cellPins.reduce((sum, pin) => sum + pin.lng, 0) / cellPins.length,
    pins: cellPins,
  }));
}
