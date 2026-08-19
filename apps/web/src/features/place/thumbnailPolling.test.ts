import { describe, expect, it } from 'vitest';
import { isThumbnailParsing } from './thumbnailPolling';

describe('isThumbnailParsing', () => {
  it.each(['PENDING', 'PROCESSING'] as const)('polls while status is %s', (status) => {
    expect(isThumbnailParsing({ thumbnailParsingStatus: status })).toBe(true);
  });

  it.each(['COMPLETED', 'FAILED'] as const)('stops polling when status is %s', (status) => {
    expect(isThumbnailParsing({ thumbnailParsingStatus: status })).toBe(false);
  });
});
