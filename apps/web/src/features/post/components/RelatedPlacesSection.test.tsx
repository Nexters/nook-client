import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/shared/toast';
import { RelatedPlacesSection } from './RelatedPlacesSection';

// 장소 삭제가 실행취소 토스트(useToast)와 연결 끊기 mutation(useQueryClient)을 쓴다 —
// 앱과 같은 provider 를 씌운다.
function renderSection(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>{ui}</ToastProvider>
    </QueryClientProvider>,
  );
}

const PLACE = {
  id: '101',
  name: '아이소',
  category: '카페',
  address: '경기 용인시 처인구 양지읍 은이로 72',
};

describe('RelatedPlacesSection', () => {
  it('onPlaceClick 이 있으면 장소 행을 눌렀을 때 그 장소 id 로 호출된다', () => {
    const onPlaceClick = vi.fn();
    renderSection(
      <RelatedPlacesSection
        postId={1}
        state={{ status: 'success', places: [PLACE], bookmarkedPlaceIds: [] }}
        postPlaces={[]}
        bookmarkedPlaceIds={[]}
        onBookmarkedChange={() => {}}
        onDirectAddClick={() => {}}
        onPlaceClick={onPlaceClick}
      />,
    );

    // 행 버튼의 접근성 이름은 이름+업종+주소가 이어진다 — 즐겨찾기 버튼("아이소 즐겨찾기")과
    // 헷갈리지 않도록 업종까지 포함해 매칭한다.
    fireEvent.click(screen.getByRole('button', { name: /아이소 카페/ }));
    expect(onPlaceClick).toHaveBeenCalledWith('101');
  });

  it('onPlaceClick 이 없으면 장소 행이 버튼이 아니라 그냥 텍스트로 렌더된다', () => {
    renderSection(
      <RelatedPlacesSection
        postId={1}
        state={{ status: 'success', places: [PLACE], bookmarkedPlaceIds: [] }}
        postPlaces={[]}
        bookmarkedPlaceIds={[]}
        onBookmarkedChange={() => {}}
        onDirectAddClick={() => {}}
      />,
    );

    expect(screen.queryByRole('button', { name: /아이소 카페/ })).not.toBeInTheDocument();
    expect(screen.getByText('아이소')).toBeInTheDocument();
  });
});
