import { describe, expect, it } from 'vitest';
import { attachPinchPan } from './pinch-pan';

/**
 * 네이버 지도의 최소 가짜 구현. 투영은 1 좌표 = 1px 인 항등 투영이라, 중심 좌표를 곧
 * 화면 오프셋처럼 읽을 수 있다.
 */
function createFakeMap(center = { x: 100, y: 100 }) {
  const listeners = new Map<string, Array<(event: unknown) => void>>();
  class Point {
    constructor(
      public x: number,
      public y: number,
    ) {}
  }
  const map = {
    center: { ...center },
    getCenter() {
      return this.center;
    },
    setCenter(next: { x: number; y: number }) {
      this.center = { x: next.x, y: next.y };
    },
    setCenterCalls: 0,
    getProjection() {
      return {
        fromCoordToOffset: (coord: { x: number; y: number }) => new Point(coord.x, coord.y),
        fromOffsetToCoord: (offset: { x: number; y: number }) => ({ x: offset.x, y: offset.y }),
      };
    },
  };
  const originalSetCenter = map.setCenter.bind(map);
  map.setCenter = (next) => {
    map.setCenterCalls += 1;
    originalSetCenter(next);
  };
  const navermaps = {
    Point,
    Event: {
      addListener(target: unknown, name: string, listener: (event: unknown) => void) {
        const list = listeners.get(name) ?? [];
        list.push(listener);
        listeners.set(name, list);
        return { target, name, listener };
      },
      removeListener(handle: { name: string; listener: (event: unknown) => void }) {
        const list = listeners.get(handle.name) ?? [];
        listeners.set(
          handle.name,
          list.filter((fn) => fn !== handle.listener),
        );
      },
    },
  };
  const fire = (name: string, offset: { x: number; y: number }) => {
    for (const fn of listeners.get(name) ?? []) fn({ offset: new Point(offset.x, offset.y) });
  };
  const listenerCount = () => [...listeners.values()].reduce((sum, list) => sum + list.length, 0);
  return {
    map: map as unknown as naver.maps.Map,
    navermaps: navermaps as unknown as typeof naver.maps,
    fire,
    state: map,
    listenerCount,
  };
}

describe('attachPinchPan', () => {
  it('핀치 중 손가락 중심이 움직인 만큼 지도 중심을 반대로 옮겨 지도가 손가락을 따라온다', () => {
    const { map, navermaps, fire, state } = createFakeMap({ x: 100, y: 100 });
    attachPinchPan(map, navermaps);

    fire('pinchstart', { x: 50, y: 50 });
    fire('pinch', { x: 60, y: 80 }); // 손가락 중심이 오른쪽 10px, 아래 30px 이동

    // 화면 콘텐츠가 오른쪽·아래로 끌려가야 하므로 중심 좌표는 왼쪽·위로 이동한다.
    expect(state.center).toEqual({ x: 90, y: 70 });
  });

  it('여러 번의 pinch 이동이 누적된다', () => {
    const { map, navermaps, fire, state } = createFakeMap({ x: 100, y: 100 });
    attachPinchPan(map, navermaps);

    fire('pinchstart', { x: 50, y: 50 });
    fire('pinch', { x: 55, y: 50 });
    fire('pinch', { x: 65, y: 50 });

    expect(state.center).toEqual({ x: 85, y: 100 });
  });

  it('손가락 중심이 그대로인 순수 핀치는 지도 중심을 건드리지 않는다', () => {
    const { map, navermaps, fire, state } = createFakeMap();
    attachPinchPan(map, navermaps);

    fire('pinchstart', { x: 50, y: 50 });
    fire('pinch', { x: 50, y: 50 });

    expect(state.setCenterCalls).toBe(0);
  });

  it('pinchend 이후의 pinch 는 무시하고, 새 pinchstart 부터 다시 추적한다', () => {
    const { map, navermaps, fire, state } = createFakeMap({ x: 100, y: 100 });
    attachPinchPan(map, navermaps);

    fire('pinchstart', { x: 50, y: 50 });
    fire('pinchend', { x: 50, y: 50 });
    fire('pinch', { x: 90, y: 90 });
    expect(state.setCenterCalls).toBe(0);

    fire('pinchstart', { x: 0, y: 0 });
    fire('pinch', { x: 10, y: 0 });
    expect(state.center).toEqual({ x: 90, y: 100 });
  });

  it('반환된 함수로 리스너를 모두 해제한다', () => {
    const { map, navermaps, listenerCount } = createFakeMap();
    const detach = attachPinchPan(map, navermaps);
    expect(listenerCount()).toBe(3);

    detach();

    expect(listenerCount()).toBe(0);
  });
});
