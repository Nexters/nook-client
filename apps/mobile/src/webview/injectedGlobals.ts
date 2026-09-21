/** 로드 전에 주입하는 셸 정보. 값이 바뀌지 않아 브리지 메시지 왕복 없이 전역으로 심는다. */
export interface InjectedGlobals {
  platform: string;
  appVersion: string;
  /** EAS autoIncrement 로 바이너리에 찍힌 번호. 모르면 빈 문자열 — 웹이 null 로 정규화한다. */
  buildNumber: string;
  /**
   * 이 셸이 응답할 수 있는 브리지 기능. 응답이 없으면 호출부가 영영 기다리는 요청은 웹이
   * 이 목록을 보고 보낼지 정한다 — 앱 버전 비교로 추정하는 것보다 셸이 직접 말하는 게 확실하다.
   */
  bridgeFeatures: readonly string[];
}

/** injectedJavaScriptBeforeContentLoaded 용 스크립트. 규약상 true 로 끝나야 한다. */
export function buildInjectedGlobalsScript(globals: InjectedGlobals): string {
  return [
    `window.__nookPlatform = ${JSON.stringify(globals.platform)};`,
    `window.__nookAppVersion = ${JSON.stringify(globals.appVersion)};`,
    `window.__nookBuildNumber = ${JSON.stringify(globals.buildNumber)};`,
    `window.__nookBridgeFeatures = ${JSON.stringify(globals.bridgeFeatures)};`,
    'true;',
  ].join(' ');
}
