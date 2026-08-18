/** 본앱 커스텀 스킴 — apps/mobile 의 appLink.ts 화이트리스트와 짝이다. */
const APP_SCHEME = 'kr.co.everynook.app';

export function buildAppSharedLink(token: string): string {
  return `${APP_SCHEME}://shared/${token}`;
}
