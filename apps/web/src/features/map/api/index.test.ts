import { beforeEach, describe, expect, it, vi } from 'vitest';

const endpoints = vi.hoisted(() => ({
  getDetail: vi.fn(),
}));

vi.mock('@/shared/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api')>()),
  ...endpoints,
}));

import type {
  PlaceDetailResponse,
  RecentPlaceResponse,
  SavedPlaceSearchPageResponse,
} from '@/shared/api';
import { fetchPlacePosts, toPlaceDetail, toRecentPlace, toSavedPlaceSearchPage } from '.';

const RECENT_PLACE_BASE: RecentPlaceResponse = {
  id: 21,
  name: '온기 카페',
  address: '서울 마포구 연남동',
  category: '카페',
  latitude: 37.56,
  longitude: 126.92,
  tags: [],
  thumbnailParsingStatus: 'COMPLETED',
  thumbnailUrl: 'https://img.example/ongi.jpg',
  accessType: 'OWNED',
  shareToken: null,
};

describe('toRecentPlace', () => {
  it.each(['PENDING', 'PROCESSING'] as const)(
    '썸네일이 없고 파싱 상태가 %s 면 thumbnailState 를 processing 으로 표시한다',
    (status) => {
      const place = toRecentPlace({
        ...RECENT_PLACE_BASE,
        thumbnailUrl: null,
        thumbnailParsingStatus: status,
      });

      expect(place.thumbnailState).toBe('processing');
    },
  );

  it('구독한 공유 아카이브의 장소는 accessType 과 공유 토큰을 그대로 옮긴다', () => {
    const place = toRecentPlace({
      ...RECENT_PLACE_BASE,
      accessType: 'SHARED',
      shareToken: 'tok-abc',
    });

    expect(place.accessType).toBe('SHARED');
    expect(place.shareToken).toBe('tok-abc');
  });

  it('내 장소는 공유 토큰이 없어 null 로 좁힌다', () => {
    const place = toRecentPlace({ ...RECENT_PLACE_BASE, accessType: 'OWNED', shareToken: null });

    expect(place.accessType).toBe('OWNED');
    expect(place.shareToken).toBeNull();
  });

  it('썸네일이 없고 파싱 상태가 FAILED 면 thumbnailState 를 failed 로 표시한다', () => {
    const place = toRecentPlace({
      ...RECENT_PLACE_BASE,
      thumbnailUrl: null,
      thumbnailParsingStatus: 'FAILED',
    });

    expect(place.thumbnailState).toBe('failed');
  });

  it('썸네일 URL 이 이미 있으면 파싱 상태와 무관하게 thumbnailState 를 비운다', () => {
    const place = toRecentPlace({
      ...RECENT_PLACE_BASE,
      thumbnailUrl: 'https://img.example/ongi.jpg',
      thumbnailParsingStatus: 'PENDING',
    });

    expect(place.thumbnailState).toBeUndefined();
  });

  it('썸네일이 없고 파싱 상태가 COMPLETED 면 thumbnailState 를 비운다', () => {
    const place = toRecentPlace({
      ...RECENT_PLACE_BASE,
      thumbnailUrl: null,
      thumbnailParsingStatus: 'COMPLETED',
    });

    expect(place.thumbnailState).toBeUndefined();
  });
});

const PAGE: SavedPlaceSearchPageResponse = {
  groups: [{ id: 3, name: '성수 카페', color: 'MINT', matchedPlaceCount: 2 }],
  hasNext: false,
  items: [
    {
      id: 11,
      name: '하우스 오브 와일드',
      address: '서울 성동구 성수이로 118',
      category: '카페',
      thumbnailUrl: 'https://img.example/haus.jpg',
    },
  ],
  page: 0,
  size: 100,
  totalElements: 1,
  totalPages: 1,
};

describe('toSavedPlaceSearchPage', () => {
  it('검색 결과 아이템을 카드 형태로, 전체 건수를 totalCount 로 옮긴다', () => {
    const page = toSavedPlaceSearchPage(PAGE);

    expect(page.totalCount).toBe(1);
    expect(page.items).toEqual([
      {
        id: 11,
        name: '하우스 오브 와일드',
        category: '카페',
        region: '서울',
        thumbnail: 'https://img.example/haus.jpg',
      },
    ]);
  });

  it('그룹 목록을 칩 형태로 옮기고 서버 색상 코드를 디자인 토큰 색으로 바꾼다', () => {
    const page = toSavedPlaceSearchPage(PAGE);

    expect(page.groups).toEqual([{ id: 3, name: '성수 카페', color: 'sky' }]);
  });

  it('모르는 그룹 색상 코드는 cement 로 대체한다', () => {
    const page = toSavedPlaceSearchPage({
      ...PAGE,
      groups: [{ id: 4, name: '새 그룹', color: 'NEON', matchedPlaceCount: 1 }],
    });

    expect(page.groups[0]?.color).toBe('cement');
  });

  it('썸네일이 null 이면 undefined 로 비운다', () => {
    const page = toSavedPlaceSearchPage({
      ...PAGE,
      items: [
        {
          id: 14,
          name: '썸네일 없는 곳',
          address: '서울 마포구',
          category: null,
          thumbnailUrl: null,
        },
      ],
    });

    expect(page.items[0]?.thumbnail).toBeUndefined();
  });

  it('카테고리가 null 이면 undefined 로 비운다', () => {
    const page = toSavedPlaceSearchPage({
      ...PAGE,
      items: [{ id: 12, name: '탐석과 사랑', address: '경기 성남시 분당구', category: null }],
    });

    expect(page.items[0]?.category).toBeUndefined();
    expect(page.items[0]?.region).toBe('경기');
  });

  it('주소가 비어 있으면 region 을 비운다', () => {
    const page = toSavedPlaceSearchPage({
      ...PAGE,
      items: [{ id: 13, name: '이름만 있는 곳', address: '', category: '카페' }],
    });

    expect(page.items[0]?.region).toBeUndefined();
  });
});

/** 서버 공통 envelope — `unwrapApiResponse` 가 이 모양을 기대한다. */
function ok(success: PlaceDetailResponse) {
  return { resultType: 'SUCCESS' as const, error: null, success };
}

/** 장소 상세 응답 중 이 테스트가 보는 부분만 채운다(나머지는 매핑 대상이 아니다). */
function placeDetailResponse(posts: {
  items: { postId: number; title?: string; savedAt: string }[];
  hasNext: boolean;
  totalElements: number;
}): PlaceDetailResponse {
  return {
    id: 9,
    name: '아이소',
    address: '서울 어딘가',
    latitude: 37.5,
    longitude: 127,
    bookmarked: false,
    photoUrls: [],
    tags: [],
    posts: {
      page: 0,
      size: 20,
      totalPages: 1,
      ...posts,
      items: posts.items.map((item) => ({ ...item, groups: [] })),
    },
    // 매핑 대상은 아니지만 응답 타입상 필수인 값들
    externalPlaceId: 'kakao-9',
    provider: 'kakao',
    thumbnailParsingStatus: 'COMPLETED' as const,
  };
}

describe('fetchPlacePosts', () => {
  beforeEach(() => {
    endpoints.getDetail.mockReset();
  });

  it('요청한 페이지 번호와 고정 페이지 크기로 장소 상세를 부른다', async () => {
    endpoints.getDetail.mockResolvedValue(
      ok(placeDetailResponse({ items: [], hasNext: false, totalElements: 0 })),
    );

    await fetchPlacePosts(9, 2);

    expect(endpoints.getDetail).toHaveBeenCalledWith(
      9,
      { page: 2, size: 20 },
      { auth: 'required' },
    );
  });

  it('hasNext 가 true 면 다음 페이지 번호를, false 면 undefined 를 돌려준다', async () => {
    endpoints.getDetail.mockResolvedValue(
      ok(
        placeDetailResponse({
          items: [{ postId: 11, title: '게시물 A', savedAt: '2026-08-19' }],
          hasNext: true,
          totalElements: 25,
        }),
      ),
    );

    const page = await fetchPlacePosts(9, 2);

    expect(page.nextPage).toBe(3);
    expect(page.totalElements).toBe(25);
    expect(page.posts).toEqual([expect.objectContaining({ id: 11, title: '게시물 A' })]);

    endpoints.getDetail.mockResolvedValue(
      ok(placeDetailResponse({ items: [], hasNext: false, totalElements: 25 })),
    );

    expect((await fetchPlacePosts(9, 3)).nextPage).toBeUndefined();
  });
});

describe('toPlaceDetail', () => {
  it('게시물 총 개수는 첫 페이지 건수가 아니라 totalElements 를 쓴다', () => {
    const place = toPlaceDetail(
      placeDetailResponse({
        items: [{ postId: 11, savedAt: '2026-08-19' }],
        hasNext: true,
        totalElements: 25,
      }),
    );

    expect(place.posts).toHaveLength(1);
    expect(place.postsTotal).toBe(25);
  });
});
