import { beforeEach, expect, it } from 'vitest';
import { localPrototypeRequest } from './local-prototype';

const request = async (path: string, method = 'GET', body?: object) =>
  (
    await localPrototypeRequest(path.startsWith('/api/') ? path : `/api/v1${path}`, {
      method,
      ...(body && { body: JSON.stringify(body) }),
    })
  ).success;
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
const issue = async () =>
  ((await request('/posts/1/share-links', 'POST')) as { token: string }).token;
it('shares the current connected places only and keeps a snapshot', async () => {
  await request('/posts/1/places/1', 'DELETE');
  const token = await issue();
  await request('/posts/1/places/2', 'DELETE');
  const shared = (await request(`/api/public/v1/post-shares/${token}`)) as {
    post: { places: { id: number }[]; groups?: unknown; memo?: unknown };
    viewerSavedPostId: number | null;
  };
  expect(shared.post.places.some((place) => place.id === 1)).toBe(false);
  expect(shared.post.places.some((place) => place.id === 2)).toBe(true);
  expect(shared.post.groups).toBeUndefined();
  expect(shared.post.memo).toBeUndefined();
  expect(shared.post.places[0]).not.toHaveProperty('memo');
  expect(shared.post.places[0]).not.toHaveProperty('bookmarked');
  expect(shared.post.places[0]).not.toHaveProperty('posts');
  expect(shared.viewerSavedPostId).toBeNull();
});
it('copies into my archive and preserves the saved copy after source edits and deletion', async () => {
  const token = await issue();
  const saved = (await request(`/post-shares/${token}/save`, 'POST', { groupIds: [2] })) as {
    postId: number;
    alreadySaved: boolean;
  };
  expect(saved.postId).not.toBe(1);
  expect(saved.alreadySaved).toBe(false);
  await request('/posts/1/places/1', 'DELETE');
  const copy = (await request(`/posts/${saved.postId}`)) as { places: { id: number }[] };
  expect(copy.places.some((place) => place.id === 1)).toBe(true);
  await request(`/posts/${saved.postId}/memo`, 'PATCH', { memo: '내 메모' });
  expect(await request(`/post-shares/${token}/save`, 'POST', { groupIds: [2] })).toMatchObject({
    postId: saved.postId,
    alreadySaved: true,
  });
  expect(await request(`/posts/${saved.postId}`)).toMatchObject({ memo: '내 메모' });
  await request('/posts/1', 'DELETE');
  await expect(request(`/api/public/v1/post-shares/${token}`)).rejects.toThrow('만료');
  expect(await request(`/posts/${saved.postId}`)).toMatchObject({
    postId: saved.postId,
    memo: '내 메모',
  });
});

it('offers saving again after the viewer deletes their own copy', async () => {
  const token = await issue();
  const saved = (await request(`/post-shares/${token}/save`, 'POST', { groupIds: [2] })) as {
    postId: number;
  };
  await request(`/posts/${saved.postId}`, 'DELETE');
  expect(await request(`/api/public/v1/post-shares/${token}`)).toMatchObject({
    viewerSavedPostId: null,
  });
});
