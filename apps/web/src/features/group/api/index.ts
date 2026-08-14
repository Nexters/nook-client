import type { Place } from '@/features/place';
import {
  type CreateGroupRequestColor,
  create as createGroupEndpoint,
  _delete as deleteGroupEndpoint,
  type GroupPlaceSummaryResponse,
  type GroupPostSummaryResponse,
  type GroupResponse,
  listPlaces as listGroupPlacesEndpoint,
  listPosts as listGroupPostsEndpoint,
  list as listGroupsEndpoint,
  unwrapApiResponse,
  update as updateGroupEndpoint,
} from '@/shared/api';
import type { GroupColor } from '@/shared/ui';
import type { Group, GroupPost } from '../types';

/**
 * 서버 색상 코드 ↔ 디자인 토큰 색상.
 * 시안 팔레트(`GROUP_COLORS`) 순서와 서버 enum 순서가 1:1로 대응한다.
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
} as const satisfies Record<CreateGroupRequestColor, GroupColor>;

const UI_TO_SERVER_COLOR = Object.fromEntries(
  Object.entries(SERVER_TO_UI_COLOR).map(([server, ui]) => [ui, server]),
) as Record<GroupColor, CreateGroupRequestColor>;

/** 서버 DTO → 화면 모델. 서버의 `postCount`가 카드 배지의 개수다. */
function toGroup(dto: GroupResponse): Group {
  return {
    id: dto.id,
    name: dto.name,
    color: SERVER_TO_UI_COLOR[dto.color as CreateGroupRequestColor] ?? 'cement',
    placeCount: dto.postCount,
    thumbnails: dto.thumbnailUrls,
  };
}

export async function fetchGroups(): Promise<Group[]> {
  const groups = unwrapApiResponse(await listGroupsEndpoint({ auth: 'required' }));
  return (groups ?? []).map(toGroup);
}

export interface GroupFormInput {
  name: string;
  color: GroupColor;
}

export async function createGroup({ name, color }: GroupFormInput): Promise<void> {
  await createGroupEndpoint({ name, color: UI_TO_SERVER_COLOR[color] }, { auth: 'required' });
}

export async function updateGroup({
  groupId,
  name,
  color,
}: GroupFormInput & { groupId: number }): Promise<void> {
  await updateGroupEndpoint(
    groupId,
    { name, color: UI_TO_SERVER_COLOR[color] },
    { auth: 'required' },
  );
}

export async function deleteGroup(groupId: number): Promise<void> {
  await deleteGroupEndpoint(groupId, { auth: 'required' });
}

/** 그리드 한 칸에 필요한 만큼만 옮긴다. 대표 미디어 1장이 커버가 된다. */
function toGroupPost(dto: GroupPostSummaryResponse): GroupPost {
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

export interface GroupPostPage {
  posts: GroupPost[];
  /** 다음 페이지 번호. 없으면 마지막 페이지다. */
  nextPage?: number;
  /** 그룹 상세의 "by Purr" 표기. 그룹 조회가 아니라 이 응답이 소유자를 알려준다. */
  ownerNickname?: string;
  /** 전체 게시물 수 — 상세 탭의 "게시물 N" 카운트. */
  totalElements: number;
}

export async function fetchGroupPosts(groupId: number, page = 0): Promise<GroupPostPage> {
  const response = unwrapApiResponse(
    await listGroupPostsEndpoint(groupId, { page, size: POSTS_PAGE_SIZE }, { auth: 'required' }),
  );

  return {
    posts: (response?.items ?? []).map(toGroupPost),
    nextPage: response?.hasNext ? page + 1 : undefined,
    ownerNickname: response?.ownerNickname,
    totalElements: response?.totalElements ?? 0,
  };
}

/** 장소 카드(`PlaceCard` — 썸네일 + 이름 + 지역·업종)가 그리는 데 필요한 만큼만 옮긴다. */
function toGroupPlace(dto: GroupPlaceSummaryResponse): Place {
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

export interface GroupPlacePage {
  places: Place[];
  /** 다음 페이지 번호. 없으면 마지막 페이지다. */
  nextPage?: number;
  /** 전체 장소 수 — 상세 탭의 "장소 N" 카운트. */
  totalElements: number;
}

export async function fetchGroupPlaces(groupId: number, page = 0): Promise<GroupPlacePage> {
  const response = unwrapApiResponse(
    await listGroupPlacesEndpoint(groupId, { page, size: PLACES_PAGE_SIZE }, { auth: 'required' }),
  );

  return {
    places: (response?.items ?? []).map(toGroupPlace),
    nextPage: response?.hasNext ? page + 1 : undefined,
    totalElements: response?.totalElements ?? 0,
  };
}
