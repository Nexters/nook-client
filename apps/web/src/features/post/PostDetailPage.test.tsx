import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { BottomMenuVisibilityProvider } from '@/app/bottom-menu-visibility';
import { PostDetailPage } from '@/features/post/PostDetailPage';

async function renderPost(postId: string) {
  // 전역 queryClient(retry: 1) 대신 재시도 없는 클라이언트 — 에러 케이스 테스트가 느려지지 않게.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <BottomMenuVisibilityProvider value={{ hidden: false, setHidden: () => {} }}>
        <MemoryRouter initialEntries={[`/post/${postId}`]}>
          <Routes>
            <Route path="/post/:postId" element={<PostDetailPage />} />
          </Routes>
        </MemoryRouter>
      </BottomMenuVisibilityProvider>
    </QueryClientProvider>,
  );
  // 연관 장소는 별도 API 로 비동기 로드된다 — 로딩 문구가 사라질 때까지 기다린다.
  await waitFor(() => expect(screen.queryByText('연관 장소를 찾는 중…')).not.toBeInTheDocument());
}

describe('게시물 상세', () => {
  it('연관 장소를 불러오는 동안 로딩 문구를 보여주고 배너는 숨긴다', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <BottomMenuVisibilityProvider value={{ hidden: false, setHidden: () => {} }}>
          <MemoryRouter initialEntries={['/post/post-1']}>
            <Routes>
              <Route path="/post/:postId" element={<PostDetailPage />} />
            </Routes>
          </MemoryRouter>
        </BottomMenuVisibilityProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByText('연관 장소를 찾는 중…')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /직접 추가/ })).not.toBeInTheDocument();

    await waitFor(() => expect(screen.queryByText('연관 장소를 찾는 중…')).not.toBeInTheDocument());
  });

  it('연관 장소가 있으면 섹션과 장소 행을 렌더한다', async () => {
    await renderPost('post-1');

    expect(screen.getByRole('heading', { name: '지금 가기 좋은 초록뷰 카페' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '연관 장소' })).toBeInTheDocument();
    expect(screen.getByText('아이소')).toBeInTheDocument();
  });

  it('매칭된 장소가 없으면 목록 없이 직접 추가 배너만 보여준다', async () => {
    await renderPost('post-2');

    expect(screen.getByRole('heading', { name: '연관 장소' })).toBeInTheDocument();
    expect(screen.queryByText('아이소')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /직접 추가/ })).toBeInTheDocument();
  });

  it('연관 장소 파싱이 실패하면 에러 스낵바를 보여준다', async () => {
    await renderPost('post-3');

    expect(screen.getByRole('heading', { name: '연관 장소' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /직접 추가/ })).toBeInTheDocument();
    expect(screen.getByText('위치를 찾지 못 했어요')).toBeInTheDocument();
  });

  it('이미지를 누르면 확대 뷰가 열린다', async () => {
    await renderPost('post-1');

    // 상세의 캐러셀 이미지는 확대 뷰를 여는 버튼이다.
    fireEvent.click(screen.getByRole('button', { name: '1번째 이미지 크게 보기' }));

    // 확대 뷰가 열리면 뒤로가기 버튼이 하나 더 생긴다(상세 헤더 + 뷰어 헤더).
    expect(screen.getAllByRole('button', { name: '뒤로 가기' })).toHaveLength(2);
  });

  it('연관 장소의 즐겨찾기를 토글한다', async () => {
    await renderPost('post-1');

    // 시안: 앞의 두 곳은 저장됨, 세 번째는 아님
    const saved = screen.getByRole('button', { name: '아이소 즐겨찾기' });
    const unsaved = screen.getByRole('button', { name: '탐석과 사랑 즐겨찾기' });
    expect(saved).toHaveAttribute('aria-pressed', 'true');
    expect(unsaved).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(unsaved);
    expect(unsaved).toHaveAttribute('aria-pressed', 'true');
  });

  it('본문은 접혀 있고 더보기로 펼친다', async () => {
    await renderPost('post-1');

    fireEvent.click(screen.getByRole('button', { name: '더보기' }));
    expect(screen.getByRole('button', { name: '접기' })).toBeInTheDocument();
  });

  it('직접 추가 배너를 누르면 장소 검색 드로어가 열린다', async () => {
    await renderPost('post-1');

    fireEvent.click(screen.getByRole('button', { name: /직접 추가/ }));

    expect(screen.getByPlaceholderText('장소명을 입력해주세요')).toBeInTheDocument();
  });

  it('드로어에 검색어를 입력하면 이름이 일치하는 장소 목록이 뜬다', async () => {
    await renderPost('post-1');

    fireEvent.click(screen.getByRole('button', { name: /직접 추가/ }));
    fireEvent.change(screen.getByPlaceholderText('장소명을 입력해주세요'), {
      target: { value: '앤미' },
    });

    expect(screen.getByText('앤미용실')).toBeInTheDocument();
  });

  it('검색 결과에서 장소를 확정하면 연관 장소에 연결되고 드로어가 닫힌다', async () => {
    await renderPost('post-3'); // 파싱 실패 케이스 — 직접 추가가 실제로 필요한 시나리오

    fireEvent.click(screen.getByRole('button', { name: /직접 추가/ }));
    fireEvent.change(screen.getByPlaceholderText('장소명을 입력해주세요'), {
      target: { value: '앤미' },
    });
    fireEvent.click(screen.getByText('앤미'));
    fireEvent.click(screen.getByRole('button', { name: '추가하기' }));

    expect(screen.queryByPlaceholderText('장소명을 입력해주세요')).not.toBeInTheDocument();
    expect(screen.getByText('앤미')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '앤미 즐겨찾기' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
