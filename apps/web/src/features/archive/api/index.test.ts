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
  it('썸네일 파싱 상태를 장소 카드 모델에 보존한다', () => {
    const dto: GroupPlaceSummaryResponse = {
      id: 31,
      name: '퍼머넌트해비탯',
      address: '서울 마포구',
      latitude: 37.5,
      longitude: 127,
      tags: [],
      thumbnailUrl: null,
      thumbnailParsingStatus: 'PROCESSING',
    };

    expect(toArchivePlace(dto)).toEqual(
      expect.objectContaining({ thumbnail: undefined, thumbnailParsingStatus: 'PROCESSING' }),
    );
  });
});
