import { beforeEach, describe, expect, it } from 'vitest';
import { localPrototypeRequest } from './local-prototype';

const request = async (path: string, method = 'GET', body?: object) =>
  (
    await localPrototypeRequest(`/api/v1${path}`, {
      method,
      ...(body && { body: JSON.stringify(body) }),
    })
  ).success;
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
describe('reminder QA scenarios', () => {
  it.each([0, 1, 2, 3, 12])(
    'seeds %i genuinely unlinked posts and counts them once',
    async (count) => {
      sessionStorage.setItem('nook.prototype.reminder', String(count));
      expect(await request('/me/place-connection-reminder')).toMatchObject({
        enabled: true,
        showBanner: count > 0,
        unlinkedPostCount: count,
      });
      const page = (await request('/posts/unlinked-places')) as {
        items: { postId: number; places: unknown[] }[];
        totalElements: number;
      };
      expect(page.totalElements).toBe(count);
      expect(page.items).toHaveLength(count);
      expect(page.items.every((post) => post.places.length === 0)).toBe(true);
    },
  );
  it('persists opting out and removes a post from the count after connecting a place', async () => {
    sessionStorage.setItem('nook.prototype.reminder', '2');
    await request('/posts/1/places', 'POST', { selectionToken: 'local-1' });
    expect(await request('/me/place-connection-reminder')).toMatchObject({ unlinkedPostCount: 1 });
    await request('/me/place-connection-reminder', 'PATCH', { enabled: false });
    expect(await request('/me/place-connection-reminder')).toMatchObject({
      enabled: false,
      showBanner: false,
      unlinkedPostCount: 1,
    });
    expect(await request('/posts/unlinked-places')).toMatchObject({ totalElements: 1 });
  });
});
