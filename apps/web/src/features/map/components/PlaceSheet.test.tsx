import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BottomMenuVisibilityProvider } from '@/app/bottom-menu-visibility';
import {
  DETAIL_COMPACT_SNAP_POINT,
  DETAIL_PAGE_SNAP_POINT,
  FULL_SNAP_POINT,
} from '@/features/map/constants';
import type { PlaceDetail as PlaceDetailModel } from '@/features/map/types';
import { ToastProvider } from '@/shared/toast';
import { PlaceSheet } from './PlaceSheet';

// 배선만 검증한다 — feature api 모듈 단위로 모킹하는 컨벤션.
const mapApi = vi.hoisted(() => ({
  disconnectPostPlace: vi.fn(),
  fetchMapPins: vi.fn(),
  fetchPlaceDetail: vi.fn(),
  fetchRecentPlaces: vi.fn(),
  fetchSavedPlaceSearch: vi.fn(),
  fetchSharedPlaceDetail: vi.fn(),
  updatePlaceBookmark: vi.fn(),
  updatePlaceMemo: vi.fn(),
}));
vi.mock('@/features/map/api', () => mapApi);

const postApi = vi.hoisted(() => ({
  fetchPostDetail: vi.fn(),
  formatAuthorHandle: vi.fn(() => '@nook'),
  searchPlaces: vi.fn(),
  updatePostMemo: vi.fn(),
}));
vi.mock('@/features/post/api', () => postApi);

const PLACE: PlaceDetailModel = {
  id: 1,
  name: '아이소',
  address: '서울 어딘가',
  lat: 37.5,
  lng: 127,
  bookmarked: true,
  photos: [],
  tags: [],
  posts: [],
  postsTotal: 0,
};

function renderSheet(snap: number | string | null, place: PlaceDetailModel = PLACE) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <BottomMenuVisibilityProvider value={{ hidden: true, setHidden: () => {} }}>
          <MemoryRouter initialEntries={['/map']}>
            <PlaceSheet
              recentPlaces={[]}
              selectedPlace={place}
              isPlaceDetailPending={false}
              isPlaceDetailError={false}
              snap={snap}
              isSearchMode={false}
              onSnapChange={() => {}}
              onSelectPlace={() => {}}
              onClose={() => {}}
              onEnterSearch={() => {}}
              onExitSearch={() => {}}
              onSearchInputFocus={() => {}}
            />
          </MemoryRouter>
        </BottomMenuVisibilityProvider>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

/**
 * jsdom 은 레이아웃을 계산하지 않아 scrollHeight/clientHeight 가 항상 0 이다 —
 * 실제 브라우저가 스크롤 이벤트와 함께 주는 값을 직접 심고 이벤트를 발화한다.
 */
function scrollTo(scroller: Element, { scrollTop }: { scrollTop: number }) {
  const CONTENT_HEIGHT = 2000;
  const VIEWPORT_HEIGHT = 800;
  for (const [key, value] of [
    ['scrollHeight', CONTENT_HEIGHT],
    ['clientHeight', VIEWPORT_HEIGHT],
    ['scrollTop', scrollTop],
  ] as const) {
    Object.defineProperty(scroller, key, { value, configurable: true, writable: true });
  }
  fireEvent.scroll(scroller);
  /** 이 값 이상으로 내리면 바닥이다(2000 - 800). */
  return CONTENT_HEIGHT - VIEWPORT_HEIGHT;
}

/** 시트는 vaul 이 body 로 포탈하므로 render 결과의 container 밖에 있다. */
function getScroller() {
  const scroller = document.querySelector('[data-slot="place-sheet-scroller"]');
  if (!scroller) throw new Error('스크롤 컨테이너를 찾지 못했다');
  return scroller;
}

const scrollToTopButton = () => screen.queryByRole('button', { name: '맨 위로' });

describe('PlaceSheet 위로가기 버튼', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mapApi.fetchRecentPlaces.mockResolvedValue([]);
  });

  it('맨 위에서는 뜨지 않는다', () => {
    renderSheet(FULL_SNAP_POINT);

    expect(scrollToTopButton()).not.toBeInTheDocument();

    scrollTo(getScroller(), { scrollTop: 0 });
    expect(scrollToTopButton()).not.toBeInTheDocument();
  });

  it('스크롤을 내리는 중간에도 뜨지 않는다 — 이게 QA 가 지적한 "상시 노출"이었다', () => {
    renderSheet(FULL_SNAP_POINT);

    scrollTo(getScroller(), { scrollTop: 600 });

    // 같은 스크롤로 고정 헤더는 떠 있다 — 헤더 전환은 그대로 두고 버튼만 분리했다.
    expect(screen.getByRole('button', { name: '뒤로' })).toBeInTheDocument();
    expect(scrollToTopButton()).not.toBeInTheDocument();
  });

  it('맨 아래에 닿으면 뜬다', () => {
    renderSheet(FULL_SNAP_POINT);
    const scroller = getScroller();

    const bottom = scrollTo(scroller, { scrollTop: 0 });
    scrollTo(scroller, { scrollTop: bottom });

    expect(scrollToTopButton()).toBeInTheDocument();
  });

  it('바닥에서 다시 올리면 사라진다', () => {
    renderSheet(FULL_SNAP_POINT);
    const scroller = getScroller();

    const bottom = scrollTo(scroller, { scrollTop: 0 });
    scrollTo(scroller, { scrollTop: bottom });
    expect(scrollToTopButton()).toBeInTheDocument();

    scrollTo(scroller, { scrollTop: 400 });
    expect(scrollToTopButton()).not.toBeInTheDocument();
  });

  it('소수점 레이아웃으로 1~2px 모자라게 멈춰도 바닥으로 본다', () => {
    renderSheet(FULL_SNAP_POINT);
    const scroller = getScroller();

    const bottom = scrollTo(scroller, { scrollTop: 0 });
    scrollTo(scroller, { scrollTop: bottom - 2 });

    expect(scrollToTopButton()).toBeInTheDocument();
  });

  it('full 이 아닌 스냅에서는 스크롤 자체가 잠겨 있어 뜨지 않는다', () => {
    renderSheet(DETAIL_PAGE_SNAP_POINT);
    const scroller = getScroller();

    const bottom = scrollTo(scroller, { scrollTop: 0 });
    scrollTo(scroller, { scrollTop: bottom });

    expect(scrollToTopButton()).not.toBeInTheDocument();
  });
});

describe('PlaceSheet — 사진 노출', () => {
  const WITH_PHOTO: PlaceDetailModel = { ...PLACE, photos: ['https://img/1.jpg'] };
  const photoButton = () => screen.queryByRole('button', { name: '1번째 사진 크게 보기' });

  it('기본 높이(detailPage)에서는 장소 사진을 보여준다', () => {
    renderSheet(DETAIL_PAGE_SNAP_POINT, WITH_PHOTO);

    expect(photoButton()).toBeInTheDocument();
  });

  it('최저 스냅에서는 사진이 있어도 접는다 — 그 높이는 사진 없는 장소에 맞춰 잡은 것이다', () => {
    renderSheet(DETAIL_COMPACT_SNAP_POINT, WITH_PHOTO);

    expect(photoButton()).not.toBeInTheDocument();
    // 이름·주소는 그대로 남는다(시안 263:11099).
    expect(screen.getByText('아이소')).toBeInTheDocument();
    expect(screen.getByText('서울 어딘가')).toBeInTheDocument();
  });
});
