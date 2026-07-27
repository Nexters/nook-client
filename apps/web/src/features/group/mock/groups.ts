import type { Group, GroupPost } from '../types';

/**
 * 그룹 화면 목데이터. **API 스펙 확정 시 이 파일 전체를 `features/group/api.ts` +
 * TanStack Query 훅으로 교체한다** — 화면은 아래 셀렉터(`getMockGroups`,
 * `getMockGroup`, `getMockGroupPosts`)만 부르므로 교체 지점이 이 세 함수다.
 */

/** 이미지 API 연동 전까지 쓰는 단색 플레이스홀더. */
function placeholder(hex: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="98" height="98"><rect width="98" height="98" fill="${hex}"/></svg>`,
  )}`;
}

const COVER_A = placeholder('#d7dce3');
const COVER_B = placeholder('#c3cbd6');
const COVER_C = placeholder('#e4e6e9');
const COVER_D = placeholder('#b4bdc9');

const COVERS = [COVER_A, COVER_B, COVER_C, COVER_D];

/** 썸네일 n장. GroupCard 는 앞 3장만 쓰고 나머지는 `+N` 으로 접는다. */
function covers(count: number) {
  return Array.from({ length: count }, (_, index) => COVERS[index % COVERS.length] ?? COVER_A);
}

const MOCK_GROUPS: Group[] = [
  {
    id: 'cafe',
    name: '카페',
    color: 'yellow',
    placeCount: 114,
    thumbnails: covers(115),
    ownerName: 'Purr',
  },
  {
    id: 'indie-cinema',
    name: '독립영화관',
    color: 'blue',
    placeCount: 3,
    thumbnails: covers(3),
    ownerName: 'Purr',
  },
  {
    id: 'saturday',
    name: '토요일 모임 장소',
    color: 'purple',
    placeCount: 2,
    thumbnails: covers(2),
    ownerName: 'Purr',
  },
  {
    id: 'lp-bar',
    name: 'LP바',
    color: 'green',
    placeCount: 1,
    thumbnails: covers(1),
    ownerName: 'Purr',
  },
  {
    id: 'seochon',
    name: '서촌 놀거리',
    color: 'sky',
    placeCount: 0,
    thumbnails: [],
    ownerName: 'Purr',
  },
];

/** 그룹에 저장된 게시물. 빈 그룹(`seochon`)은 키를 두지 않는다. */
const MOCK_POSTS: Record<string, GroupPost[]> = {
  cafe: [
    {
      id: 'post-1',
      name: '지금 가기 좋은 초록뷰 카페',
      placeCount: 3,
      authorHandle: '@abcde',
      thumbnails: [COVER_A],
    },
    {
      id: 'post-2',
      name: '몰래 가려고 저장해둔 서울 카페',
      placeCount: 1,
      authorHandle: '@abcde',
      thumbnails: [COVER_B],
    },
    {
      id: 'post-3',
      name: '힙한 것 같으면서도 차분한 공간',
      placeCount: 7,
      authorHandle: '@abcde',
      thumbnails: [COVER_C],
    },
    {
      id: 'post-4',
      name: '조용하고 고즈넉한 공간에서 힐링하기 좋은 곳',
      placeCount: 1,
      authorHandle: '@abcde',
      thumbnails: [COVER_D],
    },
  ],
  'indie-cinema': [
    {
      id: 'post-5',
      name: '나만 아는 독립영화관',
      placeCount: 3,
      authorHandle: '@abcde',
      thumbnails: [COVER_B],
    },
  ],
  saturday: [
    {
      id: 'post-6',
      name: '주말에 모이기 좋은 곳',
      placeCount: 2,
      authorHandle: '@abcde',
      thumbnails: [COVER_C],
    },
  ],
  'lp-bar': [
    {
      id: 'post-7',
      name: '을지로 LP바 모음',
      placeCount: 1,
      authorHandle: '@abcde',
      thumbnails: [COVER_D],
    },
  ],
};

export function getMockGroups(): Group[] {
  return MOCK_GROUPS;
}

export function getMockGroup(groupId: string | undefined): Group | undefined {
  return MOCK_GROUPS.find((group) => group.id === groupId);
}

export function getMockGroupPosts(groupId: string | undefined): GroupPost[] {
  return groupId ? (MOCK_POSTS[groupId] ?? []) : [];
}
