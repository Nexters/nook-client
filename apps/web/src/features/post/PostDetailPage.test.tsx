import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { BottomMenuVisibilityProvider } from '@/app/bottom-menu-visibility';
import { PostDetailPage } from '@/features/post/PostDetailPage';

function renderPost(postId: string) {
  render(
    <BottomMenuVisibilityProvider value={{ hidden: false, setHidden: () => {} }}>
      <MemoryRouter initialEntries={[`/post/${postId}`]}>
        <Routes>
          <Route path="/post/:postId" element={<PostDetailPage />} />
        </Routes>
      </MemoryRouter>
    </BottomMenuVisibilityProvider>,
  );
}

describe('게시물 상세', () => {
  it('연관 장소가 있으면 섹션과 장소 행을 렌더한다', () => {
    renderPost('post-1');

    expect(screen.getByRole('heading', { name: '지금 가기 좋은 초록뷰 카페' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '연관 장소' })).toBeInTheDocument();
    expect(screen.getByText('아이소')).toBeInTheDocument();
  });

  it('연관 장소가 없으면 섹션을 렌더하지 않는다', () => {
    renderPost('post-2');

    expect(screen.queryByRole('heading', { name: '연관 장소' })).not.toBeInTheDocument();
  });

  it('이미지를 누르면 확대 뷰가 열린다', () => {
    renderPost('post-1');

    // 상세의 캐러셀 이미지는 확대 뷰를 여는 버튼이다.
    fireEvent.click(screen.getByRole('button', { name: '1번째 이미지 크게 보기' }));

    // 확대 뷰가 열리면 뒤로가기 버튼이 하나 더 생긴다(상세 헤더 + 뷰어 헤더).
    expect(screen.getAllByRole('button', { name: '뒤로 가기' })).toHaveLength(2);
  });

  it('연관 장소의 즐겨찾기를 토글한다', () => {
    renderPost('post-1');

    // 시안: 앞의 두 곳은 저장됨, 세 번째는 아님
    const saved = screen.getByRole('button', { name: '아이소 즐겨찾기' });
    const unsaved = screen.getByRole('button', { name: '탐석과 사랑 즐겨찾기' });
    expect(saved).toHaveAttribute('aria-pressed', 'true');
    expect(unsaved).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(unsaved);
    expect(unsaved).toHaveAttribute('aria-pressed', 'true');
  });

  it('본문은 접혀 있고 더보기로 펼친다', () => {
    renderPost('post-1');

    fireEvent.click(screen.getByRole('button', { name: '더보기' }));
    expect(screen.getByRole('button', { name: '접기' })).toBeInTheDocument();
  });
});
