import { ApiClientError } from '@/shared/api';

/** 계약 문서 §8 의 권장 안내 문구를 그대로 쓴다. */
const SHARE_ERROR_MESSAGES: Record<string, string> = {
  SHARE_LINK_NOT_FOUND: '유효하지 않은 공유 링크예요.',
  SHARE_LINK_REVOKED: '공유가 해제된 아카이브예요.',
  SHARE_LINK_EXPIRED: '공유 기간이 만료된 아카이브예요.',
  SHARED_GROUP_UNAVAILABLE: '더 이상 볼 수 없는 아카이브예요.',
};

export function shareErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError && error.code) {
    const message = SHARE_ERROR_MESSAGES[error.code];
    if (message) return message;
  }
  return '아카이브를 불러오지 못했어요';
}
