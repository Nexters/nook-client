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

/**
 * OS 공유 시트("더보기"). WKWebView·모바일 브라우저는 navigator.share 를 지원한다 —
 * 미지원(구형 데스크톱)이거나 사용자가 취소하면 false 를 돌려주고 호출부가 무시한다.
 */
export async function shareViaSystem(data: { title: string; url: string }): Promise<boolean> {
  if (typeof navigator.share !== 'function') return false;
  try {
    await navigator.share(data);
    return true;
  } catch {
    return false;
  }
}
