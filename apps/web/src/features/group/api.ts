import {
  type CreateGroupRequestColor,
  create as createGroupEndpoint,
  _delete as deleteGroupEndpoint,
  type GroupPostSummaryResponse,
  type GroupResponse,
  listPosts as listGroupPostsEndpoint,
  list as listGroupsEndpoint,
  unwrapApiResponse,
  update as updateGroupEndpoint,
} from '@/shared/api';
import type { GroupColor } from '@/shared/ui';
import type { Group, GroupPost } from './types';

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
}

export async function fetchGroupPosts(groupId: number, page = 0): Promise<GroupPostPage> {
  const response = unwrapApiResponse(
    await listGroupPostsEndpoint(groupId, { page, size: POSTS_PAGE_SIZE }, { auth: 'required' }),
  );

  return {
    posts: (response?.items ?? []).map(toGroupPost),
    nextPage: response?.hasNext ? page + 1 : undefined,
    ownerNickname: response?.ownerNickname,
  };
}
