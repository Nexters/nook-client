import {
  type ArchivePlacePage,
  type ArchivePostPage,
  toArchive,
  toArchivePlace,
  toArchivePost,
  toArchiveSubscriberPage,
} from '@/features/archive/api';
import type { Archive, ArchiveSubscriberPage } from '@/features/archive/types';
import { formatAuthorHandle, toPostDetail, updatePostMemo } from '@/features/post/api';
import type { PostDetail } from '@/features/post/types';
import {
  get3 as getPostShareEndpoint,
  // 생성기가 다른 `get` 들과 이름이 겹쳐 붙인 접미사다 — 여기서만 풀어준다.
  get4 as getSharedArchiveEndpoint,
  places as listSharedPlacesEndpoint,
  posts as listSharedPostsEndpoint,
  shared as listSharedSubscribersEndpoint,
  type PostSharePlace,
  type Response as PostShareResponse,
  save1 as savePostShareEndpoint,
  save as saveSharedPostEndpoint,
  postDetail as sharedPostDetailEndpoint,
  subscribe as subscribeEndpoint,
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

/** 공유 링크 열람자도 소유자·구독자와 같은 추가한 사람 목록을 본다. */
export async function fetchSharedArchiveSubscribers(
  token: string,
  page = 0,
): Promise<ArchiveSubscriberPage> {
  const response = unwrapApiResponse(
    await listSharedSubscribersEndpoint(token, { page, size: PAGE_SIZE }),
  );
  return toArchiveSubscriberPage(response, page);
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
  const dto = unwrapApiResponse(
    await sharedPostDetailEndpoint(token, postId, { auth: 'optional' }),
  );
  if (!dto) throw new Error('공유 게시물 응답이 비어 있어요');
  return toPostDetail(dto);
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
  if (memo) {
    try {
      await updatePostMemo(response.postId, memo);
    } catch {
      // 저장 자체는 이미 성공했다 — 메모만 실패했다고 전체를 실패로 보고하면
      // 호출부가 "저장 실패" 토스트를 띄우고, 사용자는 재시도할 텐데 이미 저장된
      // 공유 게시물의 재저장/재그룹 동작은 서버 계약이 아직 불확실하다(스펙 §13).
      // 여기서 삼켜서 postId 를 정상 반환하면, 이동할 `/post/{id}` 상세가 이미
      // 편집 가능하므로 사용자가 거기서 다시 메모를 넣을 수 있다.
    }
  }
  return response.postId;
}

/** 게시물 단위 공유 링크로 본 게시물 — 저장 전 화면은 게시물 상세와 같은 모델로 그린다. */
export interface PostShare {
  detail: PostDetail;
  /** 로그인한 사람이 이미 이 공유를 저장했으면 그 내 게시물 id. */
  viewerSavedPostId: number | null;
}

/**
 * `GET /api/public/v1/post-shares/{token}` — 발급 시점에 고정된 게시물 스냅샷.
 * 비로그인도 볼 수 있고, 로그인 상태면(optional) 내 저장 여부가 함께 온다.
 */
export async function fetchPostShare(token: string): Promise<PostShare> {
  const dto = unwrapApiResponse(await getPostShareEndpoint(token, { auth: 'optional' }));
  if (!dto) throw new Error('공유 게시물 응답이 비어 있어요');
  return { detail: toPostShareDetail(dto), viewerSavedPostId: dto.viewerSavedPostId ?? null };
}

function toPostShareDetail({ post }: PostShareResponse): PostDetail {
  return {
    // 스냅샷은 처리가 끝난 게시물만 발급된다(서버 POST_SHARE_NOT_READY).
    processingStatus: 'COMPLETED',
    processingPercent: 100,
    placeParsingStatus: 'COMPLETED',
    placeParsingFailureReason: null,
    title: post.title || '제목 없는 게시물',
    // 아직 내 게시물이 아니라 속한 아카이브·메모가 없다.
    archives: [],
    places: [...post.places].sort((a, b) => a.sequence - b.sequence).map(toSharedPlace),
    post: {
      id: '',
      authorHandle: formatAuthorHandle(post.authorIdentifier, post.canonicalUrl),
      caption: post.body ?? undefined,
      media: [...post.media]
        .sort((a, b) => a.sequence - b.sequence)
        .map((item) => ({
          url: item.url,
          thumbnailUrl: item.thumbnailUrl ?? undefined,
          type: item.type,
        })),
      originalUrl: post.canonicalUrl,
    },
  };
}

function toSharedPlace(dto: PostSharePlace): PostDetail['places'][number] {
  return {
    id: dto.id,
    provider: dto.provider,
    externalPlaceId: dto.externalPlaceId,
    name: dto.name,
    address: dto.address,
    latitude: dto.latitude,
    longitude: dto.longitude,
    category: dto.category ?? undefined,
    phoneNumber: dto.phoneNumber ?? null,
    bookmarked: false,
    thumbnail: dto.thumbnailUrl ?? undefined,
    thumbnailParsingStatus: dto.thumbnailParsingStatus,
  };
}

/**
 * `POST /api/v1/post-shares/{token}/save` — 스냅샷(게시물 + 장소)을 내 아카이브로 복사한다.
 * 저장 API 에 memo 가 없어 `saveSharedPost` 와 같이 메모 수정을 이어 붙인다. 이미 저장한
 * 공유면(`alreadySaved`) 서버가 기존 메모를 지키므로 덮어쓰지 않는다. 반환값은 내 postId.
 */
export async function savePostShare(input: {
  token: string;
  groupIds: number[];
  memo?: string;
}): Promise<number> {
  const result = unwrapApiResponse(
    await savePostShareEndpoint(input.token, { groupIds: input.groupIds }, { auth: 'required' }),
  );
  if (!result?.postId) throw new Error('게시물을 저장하지 못했어요');
  const memo = input.memo?.trim();
  if (memo && !result.alreadySaved) {
    try {
      await updatePostMemo(result.postId, memo);
    } catch {
      // 저장은 이미 성공했다 — 메모는 옮겨 간 내 게시물 상세에서 다시 넣을 수 있다.
    }
  }
  return result.postId;
}
