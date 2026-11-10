/** 본앱 커스텀 스킴 — apps/mobile 의 appLink.ts 화이트리스트와 짝이다. */
const APP_SCHEME = 'kr.co.everynook.app';
const DEV_APP_SCHEME = 'kr.co.everynook.app.dev';

// dev 웹에서 연 공유 링크는 dev 앱으로 보내야 QA 가 된다. 반대로 prod 사용자가 실수로
// dev 앱(미설치)으로 가는 일이 없게, prod 쪽을 나열하지 않고 dev 호스트만 명시한다.
const DEV_HOSTS = new Set(['app-dev.everynook.co.kr', 'localhost', '127.0.0.1']);

export function buildAppSharedLink(token: string, hostname = window.location.hostname): string {
  const scheme = DEV_HOSTS.has(hostname) ? DEV_APP_SCHEME : APP_SCHEME;
  return `${scheme}://shared/${token}`;
}
