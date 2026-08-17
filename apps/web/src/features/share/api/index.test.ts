import { beforeEach, describe, expect, it, vi } from 'vitest';

const endpoints = vi.hoisted(() => ({
  get: vi.fn(),
  posts: vi.fn(),
  places: vi.fn(),
  subscribe: vi.fn(),
}));

vi.mock('@/shared/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api')>()),
  ...endpoints,
}));

import { fetchSharedArchive, fetchSharedArchivePosts, subscribeSharedArchive } from '.';

const META_RESPONSE = {
  resultType: 'SUCCESS',
  success: {
    id: 27,
    name: '카페',
    color: 'GRAY',
    postCount: 12,
    thumbnailUrls: [],
    accessType: 'SHARED',
    owner: { nickname: 'ehoidi' },
    shareToken: 'tok-123',
  },
};

describe('share fetchers', () => {
  beforeEach(() => {
    endpoints.get.mockReset().mockResolvedValue(META_RESPONSE);
    endpoints.posts.mockReset().mockResolvedValue({
      resultType: 'SUCCESS',
      success: { items: [], hasNext: false, totalElements: 0, ownerNickname: 'ehoidi' },
    });
    endpoints.subscribe.mockReset().mockResolvedValue({ resultType: 'SUCCESS', success: null });
  });

  it('메타는 인증 없이 조회하고 Archive 모델로 변환한다', async () => {
    const archive = await fetchSharedArchive('tok-123');
    expect(endpoints.get).toHaveBeenCalledWith('tok-123');
    expect(archive).toMatchObject({ id: 27, name: '카페', owner: { nickname: 'ehoidi' } });
  });

  it('게시물 목록은 페이지 파라미터를 넘겨 인증 없이 조회한다', async () => {
    const page = await fetchSharedArchivePosts('tok-123', 2);
    expect(endpoints.posts).toHaveBeenCalledWith('tok-123', { page: 2, size: 20 });
    expect(page).toEqual({
      posts: [],
      nextPage: undefined,
      ownerNickname: 'ehoidi',
      totalElements: 0,
    });
  });

  it('구독은 인증 필수로 호출한다', async () => {
    await subscribeSharedArchive('tok-123');
    expect(endpoints.subscribe).toHaveBeenCalledWith('tok-123', { auth: 'required' });
  });
});
