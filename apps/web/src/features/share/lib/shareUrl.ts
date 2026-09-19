import { nativeBridge } from '@/native-bridge';
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
 * OS 공유 시트("더보기"). 실제로 공유했으면 true 다.
 *
 * WKWebView·모바일 브라우저는 navigator.share 를 지원하지만 Android WebView 는 셸 설정에
 * 따라 이 API 를 아예 안 주거나, 주고도 NotAllowedError 를 던진다 — 그 경우 셸에 넘겨
 * RN Share 로 연다. 사용자가 시트를 그냥 닫은 것(AbortError)은 실패가 아니라 취소이므로
 * 셸로 넘기지 않는다. 어느 경로도 안 되면 false 이고 호출부가 무시한다.
 */
export async function shareViaSystem(data: { title: string; url: string }): Promise<boolean> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share(data);
      return true;
    } catch (error) {
      if ((error as Error | undefined)?.name === 'AbortError') return false;
    }
  }
  return nativeBridge.requestShare(data);
}
