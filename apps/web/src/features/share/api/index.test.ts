import { beforeEach, describe, expect, it, vi } from 'vitest';

const endpoints = vi.hoisted(() => ({
  get4: vi.fn(),
  posts: vi.fn(),
  places: vi.fn(),
  subscribe: vi.fn(),
  postDetail: vi.fn(),
  save: vi.fn(),
  get3: vi.fn(),
}));

const fetchPostDetailMock = vi.hoisted(() => vi.fn());

const postMemoMock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api')>()),
  ...endpoints,
}));

vi.mock('@/features/post/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/post/api')>()),
  updatePostMemo: postMemoMock,
  fetchPostDetail: fetchPostDetailMock,
}));

import {
  fetchPostShare,
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
    endpoints.get4.mockReset().mockResolvedValue(META_RESPONSE);
    endpoints.posts.mockReset().mockResolvedValue({
      resultType: 'SUCCESS',
      success: { items: [], hasNext: false, totalElements: 0, ownerNickname: 'ehoidi' },
    });
    endpoints.subscribe.mockReset().mockResolvedValue({ resultType: 'SUCCESS', success: null });
    postMemoMock.mockReset();
  });

  it('메타는 인증 없이 조회하고 Archive 모델로 변환한다', async () => {
    const archive = await fetchSharedArchive('tok-123');
    expect(endpoints.get4).toHaveBeenCalledWith('tok-123');
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

  it('저장은 성공했는데 메모 수정만 실패해도 postId 를 그대로 반환한다', async () => {
    endpoints.save.mockResolvedValue({ resultType: 'SUCCESS', success: { postId: 123 } });
    postMemoMock.mockRejectedValue(new Error('네트워크 오류'));
    const postId = await saveSharedPost({
      shareToken: 'tok-123',
      sharedPostId: 5,
      groupIds: [1],
      memo: '지우랑 가면 좋겠다',
    });
    expect(postId).toBe(123);
  });

  describe('게시물 단위 공유', () => {
    const snapshot = (viewerSavedPostId: number | null) => ({
      resultType: 'SUCCESS',
      success: {
        post: {
          title: '초록뷰 카페',
          canonicalUrl: 'https://instagram.com/p/x',
          media: [],
          places: [],
        },
        sharedAt: '2026-11-25T00:00:00+09:00',
        viewerSavedPostId,
      },
    });
    const MINE = [{ id: 3, name: '서울 카페', color: 'yellow' }];

    beforeEach(() => {
      fetchPostDetailMock.mockReset().mockResolvedValue({ archives: MINE });
    });

    it('저장 안 한 사람은 스냅샷만 — 내 게시물을 조회하지 않는다', async () => {
      endpoints.get3.mockResolvedValue(snapshot(null));
      const detail = await fetchPostShare('ptok');
      expect(detail.archives).toEqual([]);
      expect(fetchPostDetailMock).not.toHaveBeenCalled();
    });

    it('같은 원본을 저장한 사람은 내 게시물의 아카이브를 채운다', async () => {
      endpoints.get3.mockResolvedValue(snapshot(22));
      const detail = await fetchPostShare('ptok');
      expect(fetchPostDetailMock).toHaveBeenCalledWith(22);
      expect(detail.archives).toEqual(MINE);
    });

    it('내 게시물 조회가 실패해도 공유 화면은 그린다', async () => {
      endpoints.get3.mockResolvedValue(snapshot(22));
      fetchPostDetailMock.mockRejectedValue(new Error('boom'));
      const detail = await fetchPostShare('ptok');
      expect(detail.title).toBe('초록뷰 카페');
      expect(detail.archives).toEqual([]);
    });
  });
});
