import {
  type ArchivePlacePage,
  type ArchivePostPage,
  toArchive,
  toArchivePlace,
  toArchivePost,
} from '@/features/archive/api';
import type { Archive } from '@/features/archive/types';
import {
  get as getSharedArchiveEndpoint,
  places as listSharedPlacesEndpoint,
  posts as listSharedPostsEndpoint,
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

/** 공유 아카이브를 내 목록에 추가(구독). 멱등이라 중복 호출해도 안전하다. */
export async function subscribeSharedArchive(token: string): Promise<void> {
  await subscribeEndpoint(token, { auth: 'required' });
}
