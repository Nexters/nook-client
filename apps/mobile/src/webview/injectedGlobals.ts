/** 로드 전에 주입하는 셸 정보. 값이 바뀌지 않아 브리지 메시지 왕복 없이 전역으로 심는다. */
export interface InjectedGlobals {
  platform: string;
  appVersion: string;
  /** EAS autoIncrement 로 바이너리에 찍힌 번호. 모르면 빈 문자열 — 웹이 null 로 정규화한다. */
  buildNumber: string;
}

/** injectedJavaScriptBeforeContentLoaded 용 스크립트. 규약상 true 로 끝나야 한다. */
export function buildInjectedGlobalsScript(globals: InjectedGlobals): string {
  return [
    `window.__nookPlatform = ${JSON.stringify(globals.platform)};`,
    `window.__nookAppVersion = ${JSON.stringify(globals.appVersion)};`,
    `window.__nookBuildNumber = ${JSON.stringify(globals.buildNumber)};`,
    'true;',
  ].join(' ');
}
