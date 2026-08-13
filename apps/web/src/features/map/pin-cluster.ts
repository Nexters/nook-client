import { CLUSTER_MERGE_RADIUS_PX } from './constants';
import type { MapPin } from './types';

/** 웹 메르카토르 타일 한 변의 픽셀 수 — 네이버 지도도 256px 타일을 쓴다. */
const TILE_SIZE_PX = 256;

/**
 * 근처 핀을 하나로 묶은 덩어리. 줌아웃 상태에서 `ClusterBubble` 하나로 그려진다.
 */
export interface PinCluster {
  /**
   * 기준이 된 핀의 id. 그룹 구성은 (핀 목록, 줌)에만 달려 있어서 지도를 팬해도 값이 그대로다
   * — React 가 버블을 불필요하게 다시 마운트하지 않는다.
   */
  key: string;
  /** 소속 핀들의 무게중심 — 버블을 여기에 놓는다. */
  lat: number;
  lng: number;
  pins: MapPin[];
}

/**
 * 위경도를 해당 줌의 월드 픽셀 좌표로 옮긴다. 화면 픽셀과 같은 좌표계라 여기서 잰 거리가
 * 사용자가 화면에서 보는 거리와 일치한다(위경도 도 단위로 재면 고위도에서 가로가 늘어난다).
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
 * 화면상 `CLUSTER_MERGE_RADIUS_PX` 안에 있는 핀을 한 덩어리로 묶는다.
 *
 * 격자로 자르지 않는 이유: 격자는 칸 경계가 사이를 지나가면 바로 붙어 있는 핀도 갈라놔서,
 * 아무리 줌아웃해도 "1"짜리 버블이 계속 남는다(실측: 최소 줌에서 격자 29·1·1·1 대 반경 31·1).
 * 반경으로 재면 화면에서 붙어 보이는 것은 경계와 무관하게 항상 합쳐지고, 끝까지 따로 남는
 * 버블은 실제로 멀리 떨어진 곳뿐이다.
 *
 * 병합은 기준 핀(씨앗) 반경 안까지만이고 연쇄되지 않는다 — 이웃의 이웃까지 계속 흡수하면
 * 서울에서 부산까지 한 줄로 이어붙어 무게중심이 아무도 없는 곳에 찍힌다.
 *
 * 지도 인스턴스가 아니라 줌 숫자만 받는 순수 함수다. 멤버가 1개인 덩어리도 그대로 돌려준다
 * — 줌아웃 시안에 "1" 버블이 있고, 그건 "여긴 정말 한 곳뿐"이라는 정직한 표시다.
 */
export function clusterPins(pins: MapPin[], zoom: number): PinCluster[] {
  // 씨앗 순서를 좌표로 고정한다 — 입력 배열 순서가 흔들려도 같은 그룹이 나오도록.
  const points = pins
    .map((pin) => ({ pin, ...toWorldPixel(pin.lat, pin.lng, zoom) }))
    .sort((a, b) => a.y - b.y || a.x - b.x || a.pin.id - b.pin.id);

  const merged = new Set<number>();
  const clusters: PinCluster[] = [];

  for (const seed of points) {
    if (merged.has(seed.pin.id)) continue;
    merged.add(seed.pin.id);

    const members = [seed.pin];
    for (const other of points) {
      if (merged.has(other.pin.id)) continue;
      if (Math.hypot(other.x - seed.x, other.y - seed.y) > CLUSTER_MERGE_RADIUS_PX) continue;
      merged.add(other.pin.id);
      members.push(other.pin);
    }

    clusters.push({
      key: String(seed.pin.id),
      lat: members.reduce((sum, pin) => sum + pin.lat, 0) / members.length,
      lng: members.reduce((sum, pin) => sum + pin.lng, 0) / members.length,
      pins: members,
    });
  }

  return clusters;
}
