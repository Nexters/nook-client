import { describe, expect, it } from 'vitest';
import type { GroupPlaceSummaryResponse, GroupResponse } from '@/shared/api';
import { toArchive, toArchivePlace } from '.';

const BASE: GroupResponse = {
  id: 27,
  name: '카페',
  color: 'GRAY',
  postCount: 12,
  thumbnailUrls: [],
  accessType: 'OWNED',
};

const PLACE_BASE: GroupPlaceSummaryResponse = {
  id: 5,
  name: '스시집',
  address: '서울 강남구',
  category: '스시',
  latitude: 37.5,
  longitude: 127.0,
  tags: [],
  thumbnailParsingStatus: 'COMPLETED',
  thumbnailUrl: 'https://img.example/sushi.jpg',
};

describe('toArchive', () => {
  it('내 아카이브는 accessType OWNED 로, owner/shareToken 없이 변환한다', () => {
    const archive = toArchive(BASE);
    expect(archive.accessType).toBe('OWNED');
    expect(archive.owner).toBeUndefined();
    expect(archive.shareToken).toBeUndefined();
  });

  it('공유받은 아카이브는 owner 와 shareToken 을 보존한다', () => {
    const archive = toArchive({
      ...BASE,
      accessType: 'SHARED',
      owner: { nickname: 'ehoidi', profileImageUrl: 'https://img.example/p.png' },
      shareToken: 'tok-123',
    });
    expect(archive.accessType).toBe('SHARED');
    expect(archive.owner).toEqual({
      nickname: 'ehoidi',
      profileImageUrl: 'https://img.example/p.png',
    });
    expect(archive.shareToken).toBe('tok-123');
  });
});

describe('toArchivePlace', () => {
  it.each(['PENDING', 'PROCESSING'] as const)(
    '썸네일이 없고 파싱 상태가 %s 면 thumbnailState 를 processing 으로 표시한다',
    (status) => {
      const place = toArchivePlace({
        ...PLACE_BASE,
        thumbnailUrl: null,
        thumbnailParsingStatus: status,
      });

      expect(place.thumbnailState).toBe('processing');
    },
  );

  it('썸네일이 없고 파싱 상태가 FAILED 면 thumbnailState 를 failed 로 표시한다', () => {
    const place = toArchivePlace({
      ...PLACE_BASE,
      thumbnailUrl: null,
      thumbnailParsingStatus: 'FAILED',
    });

    expect(place.thumbnailState).toBe('failed');
  });

  it('썸네일 URL 이 이미 있으면 파싱 상태와 무관하게 thumbnailState 를 비운다', () => {
    const place = toArchivePlace({
      ...PLACE_BASE,
      thumbnailUrl: 'https://img.example/sushi.jpg',
      thumbnailParsingStatus: 'PENDING',
    });

    expect(place.thumbnailState).toBeUndefined();
  });

  it('썸네일이 없고 파싱 상태가 COMPLETED 면 thumbnailState 를 비운다', () => {
    const place = toArchivePlace({
      ...PLACE_BASE,
      thumbnailUrl: null,
      thumbnailParsingStatus: 'COMPLETED',
    });

    expect(place.thumbnailState).toBeUndefined();
  });
});
