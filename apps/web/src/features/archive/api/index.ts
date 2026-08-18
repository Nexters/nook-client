import type { Place } from '@/features/place';
import {
  type CreateGroupRequestColor,
  create as createArchiveEndpoint,
  _delete as deleteArchiveEndpoint,
  deleteSavedPost as deleteSavedPostEndpoint,
  type GroupPlaceSummaryResponse,
  type GroupPostSummaryResponse,
  type GroupResponse,
  issue as issueShareLinkEndpoint,
  listPlaces as listArchivePlacesEndpoint,
  listPosts as listArchivePostsEndpoint,
  list as listArchivesEndpoint,
  unwrapApiResponse,
  update as updateArchiveEndpoint,
} from '@/shared/api';
import type { ArchiveColor } from '@/shared/ui';
import type { Archive, ArchivePost } from '../types';

/**
 * 서버 색상 코드 ↔ 디자인 토큰 색상.
 * 시안 팔레트(`ARCHIVE_COLORS`) 순서와 서버 enum 순서가 1:1로 대응한다.
 */
const SERVER_TO_UI_COLOR = {
  YELLOW: 'yellow',
  CORAL: 'red',
  PINK: 'pink',
  PURPLE: 'purple',
  BLUE: 'blue',
  MINT: 'sky',
  GREEN: 'green',
  GRAY: 'cement',
} as const satisfies Record<CreateGroupRequestColor, ArchiveColor>;

const UI_TO_SERVER_COLOR = Object.fromEntries(
  Object.entries(SERVER_TO_UI_COLOR).map(([server, ui]) => [ui, server]),
) as Record<ArchiveColor, CreateGroupRequestColor>;

/** 서버 DTO → 화면 모델. 서버의 `postCount`가 카드 배지의 개수다. */
export function toArchive(dto: GroupResponse): Archive {
  return {
    id: dto.id,
    name: dto.name,
    color: SERVER_TO_UI_COLOR[dto.color as CreateGroupRequestColor] ?? 'cement',
    placeCount: dto.postCount,
    thumbnails: dto.thumbnailUrls,
    accessType: dto.accessType,
    owner: dto.owner
      ? { nickname: dto.owner.nickname, profileImageUrl: dto.owner.profileImageUrl ?? undefined }
      : undefined,
    shareToken: dto.shareToken ?? undefined,
  };
}

export async function fetchArchives(): Promise<Archive[]> {
  const archives = unwrapApiResponse(await listArchivesEndpoint({ auth: 'required' }));
  return (archives ?? []).map(toArchive);
}

export interface ArchiveFormInput {
  name: string;
  color: ArchiveColor;
}

export async function createArchive({ name, color }: ArchiveFormInput): Promise<void> {
  await createArchiveEndpoint({ name, color: UI_TO_SERVER_COLOR[color] }, { auth: 'required' });
}

export async function updateArchive({
  archiveId,
  name,
  color,
}: ArchiveFormInput & { archiveId: number }): Promise<void> {
  await updateArchiveEndpoint(
    archiveId,
    { name, color: UI_TO_SERVER_COLOR[color] },
    { auth: 'required' },
  );
}

export async function deleteArchive(archiveId: number): Promise<void> {
  await deleteArchiveEndpoint(archiveId, { auth: 'required' });
}

/** 공유 링크 발급 — 활성 링크가 있으면 서버가 같은 token 을 돌려준다(멱등). */
export async function issueShareLink(archiveId: number): Promise<string> {
  const response = unwrapApiResponse(await issueShareLinkEndpoint(archiveId, { auth: 'required' }));
  if (!response?.token) throw new Error('공유 링크를 발급하지 못했어요');
  return response.token;
}

/**
 * 선택 삭제 — 일괄 삭제 API가 아직 없어 단건 삭제(`DELETE /posts/{postId}`)를
 * 병렬로 묶어 보낸다. 일부만 실패해도 성공분은 이미 지워진 상태라 도중에 끊지 않고
 * 전부 시도한 뒤, 실패가 있으면 에러로 알린다 — 호출부는 성공/실패와 무관하게
 * 목록을 다시 불러와야 한다(useDeleteArchivePosts 의 onSettled 무효화).
 */
export async function deleteArchivePosts(postIds: number[]): Promise<void> {
  const results = await Promise.allSettled(
    postIds.map((postId) => deleteSavedPostEndpoint(postId, { auth: 'required' })),
  );
  const failedCount = results.filter((result) => result.status === 'rejected').length;
  if (failedCount > 0) throw new Error(`${failedCount}개 게시물을 삭제하지 못했어요`);
}

/** 그리드 한 칸에 필요한 만큼만 옮긴다. 대표 미디어 1장이 커버가 된다. */
export function toArchivePost(dto: GroupPostSummaryResponse): ArchivePost {
  return {
    id: dto.postId,
    // 제목이 없는 게시물(메모만 저장 등)도 카드가 비어 보이지 않게 메모로 대체한다.
    name: dto.title || dto.memo || '제목 없는 게시물',
    placeCount: dto.placeCount,
    thumbnails: dto.representativeMedia ? [dto.representativeMedia.url] : [],
    authorHandle: dto.authorIdentifier ?? undefined,
    // 저장 직후엔 BE 가 본문/장소를 비동기로 처리한다 — 끝나기 전엔(혹은 실패하면) 위
    // 필드들이 비어 있는 게 정상이라, 그대로 두면 "제목 없는 게시물·0 Places"로 보인다.
    // 카드가 로딩 스피너/실패 표시를 보여줄 수 있게 처리 상태만 따로 알려준다.
    processingState:
      dto.processingStatus === 'PENDING' || dto.processingStatus === 'PROCESSING'
        ? 'processing'
        : dto.processingStatus === 'FAILED'
          ? 'failed'
          : undefined,
  };
}

/** 서버 기본값(20)에 기대지 않고 그리드 2열 기준으로 맞춘다. */
const POSTS_PAGE_SIZE = 20;

export interface ArchivePostPage {
  posts: ArchivePost[];
  /** 다음 페이지 번호. 없으면 마지막 페이지다. */
  nextPage?: number;
  /** 아카이브 상세의 "by Purr" 표기. 아카이브 조회가 아니라 이 응답이 소유자를 알려준다. */
  ownerNickname?: string;
  /** 전체 게시물 수 — 상세 탭의 "게시물 N" 카운트. */
  totalElements: number;
}

export async function fetchArchivePosts(archiveId: number, page = 0): Promise<ArchivePostPage> {
  const response = unwrapApiResponse(
    await listArchivePostsEndpoint(
      archiveId,
      { page, size: POSTS_PAGE_SIZE },
      { auth: 'required' },
    ),
  );

  return {
    posts: (response?.items ?? []).map(toArchivePost),
    nextPage: response?.hasNext ? page + 1 : undefined,
    ownerNickname: response?.ownerNickname,
    totalElements: response?.totalElements ?? 0,
  };
}

/** 장소 카드(`PlaceCard` — 썸네일 + 이름 + 지역·업종)가 그리는 데 필요한 만큼만 옮긴다. */
export function toArchivePlace(dto: GroupPlaceSummaryResponse): Place {
  return {
    // Place.id 는 화면 전반에서 문자열이다 — 지도 딥링크(`/map?placeId=`)에서 다시 숫자로 쓴다.
    id: String(dto.id),
    name: dto.name,
    category: dto.category ?? '',
    region: dto.city ?? undefined,
    thumbnail: dto.thumbnailUrl ?? undefined,
  };
}

const PLACES_PAGE_SIZE = 20;

export interface ArchivePlacePage {
  places: Place[];
  /** 다음 페이지 번호. 없으면 마지막 페이지다. */
  nextPage?: number;
  /** 전체 장소 수 — 상세 탭의 "장소 N" 카운트. */
  totalElements: number;
}

export async function fetchArchivePlaces(archiveId: number, page = 0): Promise<ArchivePlacePage> {
  const response = unwrapApiResponse(
    await listArchivePlacesEndpoint(
      archiveId,
      { page, size: PLACES_PAGE_SIZE },
      { auth: 'required' },
    ),
  );

  return {
    places: (response?.items ?? []).map(toArchivePlace),
    nextPage: response?.hasNext ? page + 1 : undefined,
    totalElements: response?.totalElements ?? 0,
  };
}
