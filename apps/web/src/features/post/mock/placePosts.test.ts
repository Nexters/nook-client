import { describe, expect, it } from 'vitest';
import { getMockPlacePosts } from './placePosts';

describe('getMockPlacePosts', () => {
  it('알려진 장소 id 면 매핑된 게시물 목록을 반환한다', () => {
    const posts = getMockPlacePosts('search-1');

    expect(posts.length).toBeGreaterThan(0);
    const [firstPost] = posts;
    if (!firstPost) throw new Error('게시물을 찾지 못했다.');
    expect(firstPost.images?.length).toBeGreaterThan(0);
  });

  it('게시물이 여러 장 이미지를 가진 경우도 있다(이미지 뷰어 인디케이터 테스트용)', () => {
    const posts = getMockPlacePosts('search-1');

    expect(posts.some((post) => (post.images?.length ?? 0) > 1)).toBe(true);
  });

  it('모르는 장소 id 면 빈 배열을 반환한다', () => {
    expect(getMockPlacePosts('unknown-place')).toEqual([]);
  });
});
