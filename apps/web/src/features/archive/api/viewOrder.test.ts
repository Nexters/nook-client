import { expect, it, vi } from 'vitest';
import { createPrototypeData } from '@/dev/local-prototype-data';

const endpoints = vi.hoisted(() => ({ listPosts: vi.fn(), listPlaces: vi.fn() }));
vi.mock('@/shared/api', async (original) => ({
  ...(await original<typeof import('@/shared/api')>()),
  ...endpoints,
}));

import { fetchArchivePlacesInOrder, fetchArchivePostsInOrder } from '.';

it('collects every page before showing oldest-first posts and places', async () => {
  const seed = createPrototypeData();
  endpoints.listPosts.mockImplementation(async (_id, params) => ({
    resultType: 'SUCCESS',
    success: {
      items: seed.posts.slice(params.page * 2, params.page * 2 + 2).map((post) => ({
        ...post,
        placeCount: post.places.length,
        representativeMedia: post.media[0],
      })),
      hasNext: params.page === 0,
      totalElements: 4,
    },
  }));
  endpoints.listPlaces.mockImplementation(async (_id, params) => ({
    resultType: 'SUCCESS',
    success: {
      items: seed.places.slice(params.page * 2, params.page * 2 + 2),
      hasNext: params.page === 0,
      totalElements: 4,
    },
  }));
  const posts = await fetchArchivePostsInOrder(1, 0, true);
  expect(posts.posts.map((post) => post.id)).toEqual([4, 3, 2, 1]);
  expect(posts.nextPage).toBeUndefined();
  const places = await fetchArchivePlacesInOrder(1, 0, true);
  expect(places.places.map((place) => place.id)).toEqual(['4', '3', '2', '1']);
  expect(places.nextPage).toBeUndefined();
});
