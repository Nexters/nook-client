import type { Post } from '@/features/post';

/** 실제 이미지 API 연동 전까지 쓰는 단색 플레이스홀더. */
function placeholder(hex: string, width: number, height: number) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="${hex}"/></svg>`,
  )}`;
}

const IMAGE_A = placeholder('#c3cbd6', 160, 200);
const IMAGE_B = placeholder('#b4bdc9', 160, 200);
const IMAGE_C = placeholder('#d7dce3', 160, 200);

/**
 * `PlaceSearchResultDetail`(장소 상세)에서 보여줄, 장소에 매핑된 게시물 목데이터.
 * 검색 결과의 `Place.id`(`placeSearchResults.ts`)를 키로 쓴다.
 */
const MOCK_PLACE_POSTS: Record<string, Post[]> = {
  'search-1': [
    {
      id: 'search-1-post-1',
      authorHandle: '@nook.official on instagram',
      caption: '집밥처럼 정성 가득한 일본 가정식, 반찬까지 푸짐해 자취생 취향 저격.',
      images: [IMAGE_A, IMAGE_B, IMAGE_C],
      originalUrl: 'https://www.instagram.com/p/mock-search-1-post-1/',
    },
    {
      id: 'search-1-post-2',
      authorHandle: '@nook.official on instagram',
      caption: '관악구 자취생 필독 점심 식당 대방출.',
      images: [IMAGE_B],
      originalUrl: 'https://www.instagram.com/p/mock-search-1-post-2/',
    },
  ],
  'search-2': [
    {
      id: 'search-2-post-1',
      authorHandle: '@nook.official on instagram',
      caption: '단골이 많은 동네 미용실.',
      images: [IMAGE_A],
      originalUrl: 'https://www.instagram.com/p/mock-search-2-post-1/',
    },
  ],
};

export function getMockPlacePosts(placeId: string): Post[] {
  return MOCK_PLACE_POSTS[placeId] ?? [];
}
