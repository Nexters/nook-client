import { env } from '@/shared/config/env';

/** 서버는 token 만 주고 URL 조립은 클라이언트 몫이다 (계약 문서 §1). */
export function buildShareUrl(token: string): string {
  return `${env.webOrigin}/shared/${token}`;
}

/** 복사 성공 여부를 돌려준다 — 실패해도 throw 하지 않고 호출부가 토스트로 알린다. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
