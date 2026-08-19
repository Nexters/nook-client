import type { ThumbnailParsingStatus } from './types';

export interface ThumbnailParsingItem {
  thumbnailParsingStatus?: ThumbnailParsingStatus;
}

export function isThumbnailParsing(item: ThumbnailParsingItem): boolean {
  return item.thumbnailParsingStatus === 'PENDING' || item.thumbnailParsingStatus === 'PROCESSING';
}
