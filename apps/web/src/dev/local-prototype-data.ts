import type {
  GroupResponse,
  MemberProfileResponse,
  PlaceDetailResponse,
  SavedPostDetailResponse,
} from '@/shared/api/generated/models';

export interface PrototypeData {
  dataVersion: number;
  profile: MemberProfileResponse;
  groups: GroupResponse[];
  places: PlaceDetailResponse[];
  posts: SavedPostDetailResponse[];
}

// UI 작업용 샘플. 실제 서버의 장소·영업 정보가 아니다.
const names = [
  '오후의 커피',
  '서울숲 로스터리',
  '모퉁이 베이커리',
  '작은 정원 카페',
  '성수 커피바',
  '숲길 디저트',
  '창가의 오후',
  '브릭 커피',
  '온기 베이크',
  '느린 아침',
  '성수 식탁',
  '골목 파스타',
  '서울숲 키친',
  '오늘의 한 끼',
  '온면 식당',
  '작은 이자카야',
  '숲길 비스트로',
  '주말 브런치',
  '따뜻한 밥상',
  '저녁의 와인',
  '종이와 문장',
  '성수 아틀리에',
  '서울숲 갤러리',
  '취향의 서가',
  '작은 소품점',
  '오브제 스튜디오',
  '초록 식물상점',
  '동네 레코드',
  '느린 산책',
  '빛의 전시실',
];
const photos = [
  'photo-1501339847302-ac426a4a7cbb',
  'photo-1442512595331-e89e73853f31',
  'photo-1555507036-ab1f4038808a',
  'photo-1493857671505-72967e2e2760',
  'photo-1555396273-367ea4eb4db5',
  'photo-1414235077428-338989a2e8c0',
];

const areas = [
  { name: '성수동', district: '성동구', lat: 37.547, lng: 127.043 },
  { name: '연남동', district: '마포구', lat: 37.562, lng: 126.925 },
  { name: '을지로', district: '중구', lat: 37.566, lng: 126.991 },
  { name: '한남동', district: '용산구', lat: 37.534, lng: 127.004 },
  { name: '안국동', district: '종로구', lat: 37.579, lng: 126.985 },
  { name: '잠실동', district: '송파구', lat: 37.511, lng: 127.104 },
];
function areaAt(index: number) {
  return (
    areas[Math.floor(index / 5)] ??
    areas[0] ?? { name: '성수동', district: '성동구', lat: 37.547, lng: 127.043 }
  );
}

export function createPrototypeData(): PrototypeData {
  const groups: GroupResponse[] = [
    {
      id: 1,
      name: '커피 한 잔의 여유',
      description: '서울숲 근처에서 쉬어가기 좋은 카페와 베이커리',
      color: 'YELLOW',
    },
    {
      id: 2,
      name: '다음에 같이 가요',
      description: '주말에 함께 가보고 싶은 식당들',
      color: 'CORAL',
    },
    {
      id: 3,
      name: '취향을 찾아서',
      description: '책과 전시, 산책으로 채우는 하루',
      color: 'GREEN',
    },
  ].map((group) => ({
    ...group,
    accessType: 'OWNED',
    postCount: 10,
    subscriberCount: 0,
    subscriberPreview: [],
    thumbnailUrls: [],
    lastSavedAt: '2026-11-15T03:00:00Z',
  }));
  const places: PlaceDetailResponse[] = names.map((name, i) => ({
    id: i + 1,
    name,
    address: `서울 ${areaAt(i).district} ${areaAt(i).name} 샘플길 ${10 + i}`,
    latitude: areaAt(i).lat + Math.floor((i % 5) / 3) * 0.0018,
    longitude: areaAt(i).lng + (i % 3) * 0.002,
    category: i < 10 ? '카페·베이커리' : i < 20 ? '음식점' : '문화·공간',
    categoryGroup: i < 10 ? 'CAFE' : i < 20 ? 'RESTAURANT' : 'ETC',
    provider: 'LOCAL_SAMPLE',
    externalPlaceId: `sample-${i + 1}`,
    bookmarked: true,
    memo: i % 3 === 0 ? '주말에 여유롭게 들러보고 싶은 곳' : null,
    tags:
      i < 10
        ? ['커피', '감성 공간']
        : i < 20
          ? ['주말 약속', '맛있는 한 끼']
          : ['취향 수집', '산책'],
    thumbnailParsingStatus: 'COMPLETED',
    thumbnailUrl: `https://images.unsplash.com/${photos[i % photos.length]}?auto=format&fit=crop&w=800&q=80`,
    photoUrls: [],
    openNow: null,
    posts: { items: [], page: 0, size: 20, totalElements: 1, totalPages: 1, hasNext: false },
  }));
  const posts: SavedPostDetailResponse[] = places.map((place, i) => ({
    postId: place.id,
    title: place.name,
    body: `${place.name}에서 보내는 느긋한 하루. 취향에 맞는 공간을 모아보세요.\n\n로컬 프로토타입용 샘플 콘텐츠입니다.`,
    canonicalUrl: 'https://www.instagram.com/',
    authorIdentifier: 'nook.sample',
    memo: place.memo,
    groups: groups.slice(Math.floor(i / 10), Math.floor(i / 10) + 1),
    hashtags: ['성수', '서울숲', '취향기록'],
    media: [{ sequence: 0, type: 'IMAGE', url: place.thumbnailUrl ?? '/og-default.png' }],
    places: [{ ...place, sequence: 0 }],
    placeParsingStatus: 'COMPLETED',
    processingStatus: 'COMPLETED',
    processingPercent: 100,
    savedAt: new Date(Date.UTC(2026, 10, 15, 3, 0) - i * 3600000).toISOString(),
  }));
  for (const group of groups) {
    group.thumbnailUrls = posts
      .filter((post) => post.groups[0]?.id === group.id)
      .slice(0, 3)
      .flatMap((post) => post.media.slice(0, 1).map((media) => media.url));
  }
  return {
    dataVersion: 2,
    profile: { id: 1, nickname: '문지우', provider: 'KAKAO', profileImageUrl: null },
    groups,
    places,
    posts,
  };
}
