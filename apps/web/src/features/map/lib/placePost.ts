import type { PlaceDetailPost } from '@/features/map/types';
import { formatAuthorHandle } from '@/features/post/api';
import type { Post, PostDetail } from '@/features/post/types';

/** 대표 이미지가 없는 게시물 카드에 쓰는 회색 플레이스홀더(140x175, gray-20). */
const SAVED_POST_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="140" height="175"><rect width="140" height="175" fill="#e4e6e9"/></svg>',
)}`;

/**
 * 장소 상세가 준 얇은 게시물(`PlacePostResponse`)을 카드가 쓰는 `Post` 로 옮긴다.
 *
 * 게시물 상세(`GET /posts/{postId}`)가 도착했으면 그 쪽이 원본이다 — 본문·이미지 전체·
 * 원본 링크가 거기에만 있다. 아직(또는 실패해서) 없으면 장소 상세의 제목·작성자·대표
 * 이미지 1장으로 채운 카드를 우선 보여준다.
 */
export function toDisplayPost(placePost: PlaceDetailPost, detail?: PostDetail): Post {
  if (detail) return detail.post;

  return {
    id: String(placePost.id),
    authorHandle: formatAuthorHandle(placePost.authorHandle),
    images: [placePost.thumbnail ?? SAVED_POST_IMAGE],
  };
}
