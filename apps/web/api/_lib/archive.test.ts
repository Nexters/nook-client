import { describe, expect, it, vi } from 'vitest';
import { fetchSharedArchiveMeta } from './archive';

function fakeResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

describe('fetchSharedArchiveMeta', () => {
  it('성공 응답이면 OG 태그에 필요한 필드만 뽑아 돌려준다', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      fakeResponse(200, {
        resultType: 'SUCCESS',
        success: {
          name: '성수 카페',
          postCount: 12,
          owner: { nickname: 'ehoidi' },
          thumbnailUrls: ['https://img.example/a.jpg', 'https://img.example/b.jpg'],
        },
      }),
    );

    const meta = await fetchSharedArchiveMeta('https://api.example', 'tok-123', fetchImpl);

    expect(meta).toEqual({
      name: '성수 카페',
      ownerNickname: 'ehoidi',
      postCount: 12,
      thumbnailUrl: 'https://img.example/a.jpg',
    });
    expect(fetchImpl).toHaveBeenCalledWith('https://api.example/api/public/v1/groups/tok-123');
  });

  it('썸네일이 없으면 thumbnailUrl 을 비운다', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      fakeResponse(200, {
        resultType: 'SUCCESS',
        success: { name: '빈 아카이브', postCount: 0, thumbnailUrls: [] },
      }),
    );

    const meta = await fetchSharedArchiveMeta('https://api.example', 'empty', fetchImpl);

    expect(meta?.thumbnailUrl).toBeUndefined();
  });

  it('닉네임이 없는 소유자(owner 없음)는 ownerNickname 을 비운다', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      fakeResponse(200, {
        resultType: 'SUCCESS',
        success: { name: '이름만', postCount: 1, thumbnailUrls: [] },
      }),
    );

    const meta = await fetchSharedArchiveMeta('https://api.example', 'no-owner', fetchImpl);

    expect(meta?.ownerNickname).toBeUndefined();
  });

  it('토큰이 무효해 404 가 오면 null 을 돌려준다', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(fakeResponse(404, {}));

    const meta = await fetchSharedArchiveMeta('https://api.example', 'expired', fetchImpl);

    expect(meta).toBeNull();
  });

  it('resultType 이 FAIL 이면 null 을 돌려준다', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        fakeResponse(200, { resultType: 'FAIL', error: { errorCode: 'NOT_FOUND' } }),
      );

    const meta = await fetchSharedArchiveMeta('https://api.example', 'bad', fetchImpl);

    expect(meta).toBeNull();
  });

  it('네트워크 요청 자체가 실패해도 던지지 않고 null 을 돌려준다', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network down'));

    const meta = await fetchSharedArchiveMeta('https://api.example', 'x', fetchImpl);

    expect(meta).toBeNull();
  });
});
