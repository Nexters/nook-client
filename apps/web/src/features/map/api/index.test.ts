import { beforeEach, describe, expect, it, vi } from 'vitest';

const endpoints = vi.hoisted(() => ({
  getDetail: vi.fn(),
}));

vi.mock('@/shared/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api')>()),
  ...endpoints,
}));

import type { PlaceDetailResponse } from '@/shared/api';
import { fetchPlacePosts, toPlaceDetail } from '.';

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
