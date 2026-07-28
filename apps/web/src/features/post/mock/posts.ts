import type { GroupColor } from '@/shared/ui';
import type { Post } from '../types';

/**
 * 게시물 상세 목데이터. **API 스펙 확정 시 `features/post/api.ts` + TanStack Query 로
 * 교체한다** — 화면은 `getMockPostDetail` 하나만 부르므로 교체 지점이 그 함수다.
 *
 * 연관 장소와 북마크 초기값은 별도 파싱 API(`mock/placeParsing.ts` → `getMockPlaceParsing`)가 담당한다.
 */

/** 이미지 API 연동 전까지 쓰는 단색 플레이스홀더. */
function placeholder(hex: string, width: number, height: number) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="${hex}"/></svg>`,
  )}`;
}

const IMAGE_A = placeholder('#c3cbd6', 281, 300);
const IMAGE_B = placeholder('#b4bdc9', 281, 300);
const IMAGE_C = placeholder('#d7dce3', 281, 300);
const IMAGE_D = placeholder('#cfd5dd', 281, 300);

/** 게시물 상세가 한 화면에 필요로 하는 묶음 — 게시물 + 저장된 그룹. */
export interface PostDetail {
  post: Post;
  title: string;
  groupName: string;
  groupColor: GroupColor;
  memo?: string;
}

const MOCK_POST_DETAILS: Record<string, PostDetail> = {
  'post-1': {
    title: '지금 가기 좋은 초록뷰 카페',
    groupName: '카페',
    groupColor: 'yellow',
    memo: '지우랑 가면 좋겠다',
    post: {
      id: 'post-1',
      authorHandle: '@nook.official on instagram',
      caption:
        '초록뷰가 아름다운 카페 공간 아직 4월 말인데도 여름이 벌써 코앞에 있는 것 같아요. 더운 건 힘들지만, 녹색 빛 가득한 풍경을 떠올리면 왜인지 좋았던 것 같기도…👀 우선 더위는 잠시 뒤로 하고, 푸르게 물든 자연 속에서 힐링부터 즐겨요!\n\n#숲뷰 #카페추천 #서울근교카페 #숲속카페',
      images: [IMAGE_A, IMAGE_B, IMAGE_C, IMAGE_D],
      originalUrl: 'https://instagram.com',
    },
  },
  // 시안 `연관 장소 X` — 파싱은 성공했지만 연결된 장소가 없는 게시물.
  'post-2': {
    title: '몰래 가려고 저장해둔 서울 카페',
    groupName: '카페',
    groupColor: 'yellow',
    post: {
      id: 'post-2',
      authorHandle: '@nook.official on instagram',
      caption: '조용히 혼자 가고 싶은 서울 카페들을 모아뒀어요. 주말 오전이 가장 한산합니다.',
      images: [IMAGE_B, IMAGE_C],
      originalUrl: 'https://instagram.com',
    },
  },
  // 시안 `게시물 상세_직접 입력` 실패 케이스 — 연관 장소 파싱 자체가 실패하는 게시물.
  'post-3': {
    title: '위치 태그 없이 올라온 카페 사진',
    groupName: '카페',
    groupColor: 'yellow',
    post: {
      id: 'post-3',
      authorHandle: '@nook.official on instagram',
      caption: '위치 정보 없이 올라온 게시물이라 연관 장소 파싱이 실패할 수 있어요.',
      images: [IMAGE_D],
      originalUrl: 'https://instagram.com',
    },
  },
  // 파싱 진행 중(PENDING → 3초 폴링 후 SUCCESS) 데모용 게시물 — mock/placeParsing.ts 참고.
  'post-4': {
    title: '방금 저장해서 아직 분석 중인 게시물',
    groupName: '카페',
    groupColor: 'yellow',
    post: {
      id: 'post-4',
      authorHandle: '@nook.official on instagram',
      caption: '방금 저장한 게시물은 연관 장소 파싱이 끝날 때까지 로딩으로 보인다.',
      images: [IMAGE_A],
      originalUrl: 'https://instagram.com',
    },
  },
};

export function getMockPostDetail(postId: string | undefined): PostDetail | undefined {
  return postId ? MOCK_POST_DETAILS[postId] : undefined;
}
