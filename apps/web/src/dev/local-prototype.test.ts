import { beforeEach, describe, expect, it, vi } from 'vitest';
import { localPrototypeRequest } from './local-prototype';

const request = async (path: string, method = 'GET', body?: object) => {
  const response = await localPrototypeRequest(`/api/v1${path}`, {
    method,
    ...(body && { body: JSON.stringify(body) }),
  });
  return response.success;
};

beforeEach(() => localStorage.clear());

describe('local prototype', () => {
  it('paginates all 30 places and filters by archive and map bounds', async () => {
    const first = await request('/places/recent?size=20');
    expect(first).toMatchObject({ totalCount: 30, hasNext: true });
    const page = first as { items: { id: number }[]; nextCursor: string };
    const second = await request(`/places/recent?size=20&cursor=${page.nextCursor}`);
    expect(second).toMatchObject({ hasNext: false });
    expect((second as { items: unknown[] }).items).toHaveLength(10);
    expect(await request('/places/map?groupIds=1')).toHaveLength(10);
    expect(
      await request('/places/map?northLatitude=0&southLatitude=-1&eastLongitude=1&westLongitude=0'),
    ).toEqual([]);
  });

  it('persists archive edits and removes deleted memberships from post detail', async () => {
    const archive = (await request('/groups', 'POST', { name: '주말 산책', color: 'MINT' })) as {
      id: number;
    };
    await request(`/groups/${archive.id}`, 'PATCH', {
      name: '주말 카페',
      description: '다시 가고 싶은 곳',
    });
    expect(await request('/groups')).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: '주말 카페' })]),
    );
    await request('/places/1/memo', 'PATCH', { memo: '창가 자리' });
    expect(await request('/places/1')).toMatchObject({ memo: '창가 자리' });
    await request('/groups/1', 'DELETE');
    expect(await request('/posts/1')).toMatchObject({ groups: [] });
  });

  it('rejects unsupported requests without calling the server', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch');
    await expect(request('/unsupported', 'POST')).rejects.toThrow('로컬 목 모드');
    expect(fetcher).not.toHaveBeenCalled();
    fetcher.mockRestore();
  });
});

it('supports shared links, archive moves and bookmark state across requests', async () => {
  const link = (await request('/groups/1/share-link', 'POST')) as { token: string };
  const shared = await localPrototypeRequest(`/api/public/v1/groups/${link.token}`);
  expect(shared.success).toMatchObject({ id: 1, name: '커피 한 잔의 여유' });
  await request('/posts/1/groups', 'PUT', { groupIds: [2] });
  // 게시물마다 같은 동네 장소 3곳을 담는다 — 1번 게시물(장소 1·2·3)을 옮겨도 그 장소들은
  // 1번 아카이브의 다른 게시물에도 담겨 있어 남고, 2번 아카이브엔 세 곳이 더해진다.
  expect(await request('/groups/1/places')).toMatchObject({ totalElements: 10 });
  expect(await request('/groups/2/places')).toMatchObject({ totalElements: 13 });
  await request('/places/1/bookmark', 'PATCH', { bookmarked: false });
  const map = (await request('/places/map')) as { id: number }[];
  expect(map.some((place) => place.id === 1)).toBe(false);
  expect(await request('/posts/1')).toMatchObject({
    places: expect.arrayContaining([expect.objectContaining({ id: 1, bookmarked: false })]),
  });
});

it('splits the Seoul sample cluster as zoom increases', async () => {
  const { clusterPins } = await import('@/features/map/pin-cluster');
  const places = (await request('/places/map')) as {
    id: number;
    latitude: number;
    longitude: number;
    name: string;
  }[];
  const pins = places.map((place) => ({
    id: place.id,
    lat: place.latitude,
    lng: place.longitude,
    name: place.name,
    color: 'yellow' as const,
  }));
  const broad = clusterPins(pins, 9);
  const city = clusterPins(pins, 11);
  const neighborhood = clusterPins(pins, 14);
  expect(broad).toHaveLength(1);
  expect(city.length).toBeGreaterThan(broad.length);
  expect(neighborhood.length).toBeGreaterThan(city.length);
  expect(clusterPins(pins, 18)).toHaveLength(30);
});

it('updates existing sample coordinates without losing the user edits', async () => {
  const { createPrototypeData } = await import('./local-prototype-data');
  const old = createPrototypeData();
  old.dataVersion = 1;
  for (const group of old.groups) {
    if (group.id === 1) group.name = '내가 고친 아카이브';
  }
  for (const place of old.places) {
    place.latitude = 37.545;
    place.longitude = 127.04;
    place.memo = '유지할 메모';
  }
  localStorage.setItem('nook.local-prototype.v1', JSON.stringify(old));
  expect(await request('/groups')).toEqual(
    expect.arrayContaining([expect.objectContaining({ name: '내가 고친 아카이브' })]),
  );
  expect(await request('/places/30')).toMatchObject({
    memo: '유지할 메모',
    address: expect.stringContaining('잠실동'),
  });
  const stored = JSON.parse(localStorage.getItem('nook.local-prototype.v1') ?? '{}');
  expect(stored.dataVersion).toBe(3);
});
