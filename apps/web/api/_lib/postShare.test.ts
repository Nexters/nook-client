import { describe, expect, it, vi } from 'vitest';
import { fetchPostShareOgMeta } from './postShare';

function fakeResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

describe('fetchPostShareOgMeta', () => {
  it('제목·장소 수·첫 미디어(영상은 포스터)로 OG 메타를 만든다', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      fakeResponse(200, {
        resultType: 'SUCCESS',
        success: {
          post: {
            title: '초록뷰 카페',
            media: [
              { url: 'https://img.example/b.jpg', type: 'IMAGE', sequence: 2 },
              {
                url: 'https://v.example/a.mp4',
                thumbnailUrl: 'https://img.example/a.jpg',
                type: 'VIDEO',
                sequence: 1,
              },
            ],
            places: [{}, {}],
          },
        },
      }),
    );

    expect(await fetchPostShareOgMeta('https://api.example', 'ptok', fetchImpl)).toEqual({
      title: '초록뷰 카페',
      description: '2 Places',
      imageUrl: 'https://img.example/a.jpg',
    });
    expect(fetchImpl).toHaveBeenCalledWith('https://api.example/api/public/v1/post-shares/ptok');
  });

  it('만료(410)·실패 응답이면 null 이다', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(fakeResponse(410, {}));
    expect(await fetchPostShareOgMeta('https://api.example', 'ptok', fetchImpl)).toBeNull();
  });

  it('네트워크 오류도 던지지 않고 null 이다', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('down'));
    expect(await fetchPostShareOgMeta('https://api.example', 'ptok', fetchImpl)).toBeNull();
  });
});
