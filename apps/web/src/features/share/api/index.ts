import {
  type ArchivePlacePage,
  type ArchivePostPage,
  toArchive,
  toArchivePlace,
  toArchivePost,
} from '@/features/archive/api';
import type { Archive } from '@/features/archive/types';
import { toPostDetail, updatePostMemo } from '@/features/post/api';
import type { PostDetail } from '@/features/post/types';
import { toPlaceDetail } from '@/features/map/api';
import type { PlaceDetail } from '@/features/map/types';
import {
  get as getSharedArchiveEndpoint,
  places as listSharedPlacesEndpoint,
  posts as listSharedPostsEndpoint,
  subscribe as subscribeEndpoint,
  placeDetail as sharedPlaceDetailEndpoint,
  postDetail as sharedPostDetailEndpoint,
  save as saveSharedPostEndpoint,
  unwrapApiResponse,
} from '@/shared/api';

/** 목록 페이지 크기 — 기존 아카이브 상세와 동일. */
const PAGE_SIZE = 20;

/**
 * 공유 아카이브 메타 — 비로그인 공개 조회라 auth 옵션을 아예 주지 않는다(기본 'none').
 * 응답이 GroupResponse 그대로라 화면 모델도 Archive 를 그대로 쓴다.
 */
export async function fetchSharedArchive(token: string): Promise<Archive> {
  const dto = unwrapApiResponse(await getSharedArchiveEndpoint(token));
  if (!dto) throw new Error('공유 아카이브 응답이 비어 있어요');
  return toArchive(dto);
}

export async function fetchSharedArchivePosts(token: string, page = 0): Promise<ArchivePostPage> {
  const response = unwrapApiResponse(
    await listSharedPostsEndpoint(token, { page, size: PAGE_SIZE }),
  );
  return {
    posts: (response?.items ?? []).map(toArchivePost),
    nextPage: response?.hasNext ? page + 1 : undefined,
    ownerNickname: response?.ownerNickname,
    totalElements: response?.totalElements ?? 0,
  };
}

export async function fetchSharedArchivePlaces(token: string, page = 0): Promise<ArchivePlacePage> {
  const response = unwrapApiResponse(
    await listSharedPlacesEndpoint(token, { page, size: PAGE_SIZE }),
  );
  return {
    places: (response?.items ?? []).map(toArchivePlace),
    nextPage: response?.hasNext ? page + 1 : undefined,
    totalElements: response?.totalElements ?? 0,
  };
}

/** 공유 아카이브를 내 목록에 추가(구독). 멱등이라 중복 호출해도 안전하다. */
export async function subscribeSharedArchive(token: string): Promise<void> {
  await subscribeEndpoint(token, { auth: 'required' });
}

/**
 * 공유 게시물 상세. 로그인 상태면 토큰을 실어(optional) 응답 groups 에
 * "내가 같은 원본을 저장해 둔 아카이브 목록"이 담긴다 — 저장 전/후 판별에 쓴다.
 */
export async function fetchSharedPostDetail(token: string, postId: number): Promise<PostDetail> {
  const dto = unwrapApiResponse(await sharedPostDetailEndpoint(token, postId, { auth: 'optional' }));
  if (!dto) throw new Error('공유 게시물 응답이 비어 있어요');
  return toPostDetail(dto);
}

export async function fetchSharedPlaceDetail(token: string, placeId: number): Promise<PlaceDetail> {
  const dto = unwrapApiResponse(await sharedPlaceDetailEndpoint(token, placeId));
  if (!dto) throw new Error('공유 장소 응답이 비어 있어요');
  return toPlaceDetail(dto);
}

/**
 * 공유 게시물 단건 저장. save 바디에 memo 필드가 없어(계약 확인) 메모는 저장으로 얻은
 * 내 postId 에 기존 메모 수정 API 를 이어 붙이는 2단계 조합이다. 반환값은 내 postId —
 * 호출부가 기존 게시물 상세(`/post/{postId}`)로 전환하는 데 쓴다.
 */
export async function saveSharedPost(input: {
  shareToken: string;
  sharedPostId: number;
  groupIds: number[];
  memo?: string;
}): Promise<number> {
  const response = unwrapApiResponse(
    await saveSharedPostEndpoint(
      input.shareToken,
      input.sharedPostId,
      { groupIds: input.groupIds },
      { auth: 'required' },
    ),
  );
  if (!response?.postId) throw new Error('게시물을 저장하지 못했어요');
  const memo = input.memo?.trim();
  if (memo) await updatePostMemo(response.postId, memo);
  return response.postId;
}
