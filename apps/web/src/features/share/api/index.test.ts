import { beforeEach, describe, expect, it, vi } from 'vitest';

const endpoints = vi.hoisted(() => ({
  get: vi.fn(),
  posts: vi.fn(),
  places: vi.fn(),
  subscribe: vi.fn(),
  postDetail: vi.fn(),
  placeDetail: vi.fn(),
  save: vi.fn(),
}));

const postMemoMock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api')>()),
  ...endpoints,
}));

vi.mock('@/features/post/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/post/api')>()),
  updatePostMemo: postMemoMock,
}));

import {
  fetchSharedArchive,
  fetchSharedArchivePosts,
  fetchSharedPostDetail,
  saveSharedPost,
  subscribeSharedArchive,
} from '.';

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
    postMemoMock.mockReset();
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

  it('게시물 상세는 로그인 시 저장 상태가 실리도록 optional 인증으로 조회한다', async () => {
    endpoints.postDetail.mockResolvedValue({
      resultType: 'SUCCESS',
      success: {
        postId: 5,
        canonicalUrl: 'https://instagram.com/p/x',
        groups: [],
        media: [],
        hashtags: [],
        places: [],
        processingStatus: 'COMPLETED',
        processingPercent: 100,
        placeParsingStatus: 'COMPLETED',
        savedAt: '2026-08-20T00:00:00Z',
      },
    });
    await fetchSharedPostDetail('tok-123', 5);
    expect(endpoints.postDetail).toHaveBeenCalledWith('tok-123', 5, { auth: 'optional' });
  });

  it('단건 저장은 저장 후 메모가 있으면 내 postId 로 메모 수정까지 이어 부른다', async () => {
    endpoints.save.mockResolvedValue({ resultType: 'SUCCESS', success: { postId: 123 } });
    const postId = await saveSharedPost({
      shareToken: 'tok-123',
      sharedPostId: 5,
      groupIds: [1, 2],
      memo: '지우랑 가면 좋겠다',
    });
    expect(endpoints.save).toHaveBeenCalledWith(
      'tok-123',
      5,
      { groupIds: [1, 2] },
      { auth: 'required' },
    );
    expect(postMemoMock).toHaveBeenCalledWith(123, '지우랑 가면 좋겠다');
    expect(postId).toBe(123);
  });

  it('메모가 없으면 저장만 하고 끝낸다', async () => {
    endpoints.save.mockResolvedValue({ resultType: 'SUCCESS', success: { postId: 123 } });
    await saveSharedPost({ shareToken: 'tok-123', sharedPostId: 5, groupIds: [1] });
    expect(postMemoMock).not.toHaveBeenCalled();
  });
});
