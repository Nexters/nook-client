import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlaceSearchResultDetail } from './PlaceSearchResultDetail';

const PLACE = {
  id: 'search-1',
  name: '앤미',
  category: '일식',
  address: '서울 관악구 관악로 12길 47 (봉천동)',
  landmark: '서울대입구역 2번 출구',
  keywords: ['조용한', '정갈한'],
};

const POSTS = [
  { id: 'p1', authorHandle: '@a', images: ['a.png'], originalUrl: 'https://x.com/1' },
  { id: 'p2', authorHandle: '@a', images: ['b.png', 'c.png'], originalUrl: 'https://x.com/2' },
];

describe('PlaceSearchResultDetail', () => {
  it('장소 이름·업종·지형지물·키워드를 보여준다', () => {
    render(
      <PlaceSearchResultDetail
        place={PLACE}
        posts={POSTS}
        expanded={false}
        onSelectPost={() => {}}
      />,
    );

    expect(screen.getByText('앤미')).toBeInTheDocument();
    expect(screen.getByText('일식')).toBeInTheDocument();
    expect(screen.getByText('서울대입구역 2번 출구')).toBeInTheDocument();
    expect(screen.getByText('조용한')).toBeInTheDocument();
  });

  it('게시물 썸네일을 누르면 onSelectPost 가 그 게시물로 호출된다', () => {
    const onSelectPost = vi.fn();
    render(
      <PlaceSearchResultDetail
        place={PLACE}
        posts={POSTS}
        expanded={false}
        onSelectPost={onSelectPost}
      />,
    );

    const [firstThumbnail] = screen.getAllByRole('button', { name: '게시물 크게 보기' });
    if (!firstThumbnail) throw new Error('게시물 썸네일을 찾지 못했다.');
    fireEvent.click(firstThumbnail);
    expect(onSelectPost).toHaveBeenCalledWith(POSTS[0]);
  });

  it('expanded=true 면 게시물이 그리드로 보인다', () => {
    const { container } = render(
      <PlaceSearchResultDetail place={PLACE} posts={POSTS} expanded onSelectPost={() => {}} />,
    );

    expect(container.querySelector('.grid')).not.toBeNull();
  });
});
